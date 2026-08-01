import type { z } from "zod";
import type { Db } from "../../db/client.js";
import { BadRequestError, NotFoundError } from "../../lib/http/problem.js";
import { paginate } from "../../lib/http/pagination.js";
import { authRepository } from "../auth/auth.repository.js";
import { projectsRepository } from "../projects/projects.repository.js";
import { type CreateTaskSchema, type TaskListQuery, type UpdateTaskSchema } from "./tasks.dto.js";
import { tasksRepository } from "./tasks.repository.js";

type CreateInput = z.infer<typeof CreateTaskSchema>;
type UpdateInput = z.infer<typeof UpdateTaskSchema>;

/** Checks that the related entities exist — clearer than mapping raw foreign-key errors. */
async function assertRelations(db: Db, input: { projectId?: string; assigneeId?: string | null }) {
  if (input.projectId) {
    const project = await projectsRepository.findById(db, input.projectId);
    if (!project) {
      throw new BadRequestError("Wskazany projekt nie istnieje.");
    }
  }
  if (input.assigneeId) {
    const user = await authRepository.findUserById(db, input.assigneeId);
    if (!user) {
      throw new BadRequestError("Wskazany wykonawca nie istnieje.");
    }
  }
}

export const tasksService = {
  async list(db: Db, query: TaskListQuery) {
    const { items, total } = await tasksRepository.list(db, query);
    return paginate(items, total, query);
  },

  async getById(db: Db, id: string) {
    const task = await tasksRepository.findById(db, id);
    if (!task) {
      throw new NotFoundError("Zadanie nie istnieje.");
    }
    return task;
  },

  async create(db: Db, input: CreateInput, createdById: string) {
    await assertRelations(db, input);
    return tasksRepository.create(db, { ...input, createdBy: createdById });
  },

  async update(db: Db, id: string, input: UpdateInput) {
    await assertRelations(db, input);
    const updated = await tasksRepository.update(db, id, input);
    if (!updated) {
      throw new NotFoundError("Zadanie nie istnieje.");
    }
    return updated;
  },

  async remove(db: Db, id: string) {
    const deleted = await tasksRepository.softDelete(db, id);
    if (!deleted) {
      throw new NotFoundError("Zadanie nie istnieje.");
    }
  },
};
