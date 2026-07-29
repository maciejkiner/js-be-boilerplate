import { z } from "zod";
import type { Db } from "../../db/client.js";
import { BadRequestError, NotFoundError } from "../../lib/http/problem.js";
import { paginate } from "../../lib/http/pagination.js";
import {
  type CreateCommentSchema,
  type CommentListQuery,
  type UpdateCommentSchema,
} from "./comments.dto.js";
import { tasksRepository } from "../tasks/tasks.repository.js";
import { authRepository } from "../auth/auth.repository.js";
import { commentsRepository } from "./comments.repository.js";

type CreateInput = z.infer<typeof CreateCommentSchema>;
type UpdateInput = z.infer<typeof UpdateCommentSchema>;

async function assertRelations(
  db: Db,
  input: { taskId?: string | null; authorId?: string | null },
) {
  if (input.taskId) {
    const related = await tasksRepository.findById(db, input.taskId);
    if (!related) {
      throw new BadRequestError("Wskazana relacja (taskId) nie istnieje.");
    }
  }
  if (input.authorId) {
    const related = await authRepository.findUserById(db, input.authorId);
    if (!related) {
      throw new BadRequestError("Wskazana relacja (authorId) nie istnieje.");
    }
  }
}

/** Logika biznesowa comments. Wygenerowane. */
export const commentsService = {
  async list(db: Db, query: CommentListQuery) {
    const { items, total } = await commentsRepository.list(db, query);
    return paginate(items, total, query);
  },

  async getById(db: Db, id: string) {
    const row = await commentsRepository.findById(db, id);
    if (!row) {
      throw new NotFoundError("Comment nie istnieje.");
    }
    return row;
  },

  async create(db: Db, input: CreateInput, createdById: string) {
    await assertRelations(db, input);
    return commentsRepository.create(db, { ...input, createdBy: createdById });
  },

  async update(db: Db, id: string, input: UpdateInput) {
    await assertRelations(db, input);
    const updated = await commentsRepository.update(db, id, input);
    if (!updated) {
      throw new NotFoundError("Comment nie istnieje.");
    }
    return updated;
  },

  async remove(db: Db, id: string) {
    const deleted = await commentsRepository.softDelete(db, id);
    if (!deleted) {
      throw new NotFoundError("Comment nie istnieje.");
    }
  },
};
