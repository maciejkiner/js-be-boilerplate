import { z } from "zod";
import type { Db } from "../../db/client.js";
import { NotFoundError } from "../../lib/http/problem.js";
import { paginate } from "../../lib/http/pagination.js";
import type { Mailer } from "../../lib/mailer/index.js";
import {
  type CreateProjectSchema,
  type ProjectListQuery,
  type UpdateProjectSchema,
} from "./projects.dto.js";
import { projectsRepository } from "./projects.repository.js";

type CreateInput = z.infer<typeof CreateProjectSchema>;
type UpdateInput = z.infer<typeof UpdateProjectSchema>;

/** Business logic for projects. The layer between the routes and the repository. */
export const projectsService = {
  async list(db: Db, query: ProjectListQuery) {
    const { items, total } = await projectsRepository.list(db, query);
    return paginate(items, total, query);
  },

  async getById(db: Db, id: string) {
    const project = await projectsRepository.findById(db, id);
    if (!project) {
      throw new NotFoundError("Projekt nie istnieje.");
    }
    return project;
  },

  create(db: Db, input: CreateInput, createdById: string) {
    return projectsRepository.create(db, { ...input, createdBy: createdById });
  },

  async update(db: Db, id: string, input: UpdateInput) {
    const updated = await projectsRepository.update(db, id, input);
    if (!updated) {
      throw new NotFoundError("Projekt nie istnieje.");
    }
    return updated;
  },

  async remove(db: Db, id: string) {
    const deleted = await projectsRepository.softDelete(db, id);
    if (!deleted) {
      throw new NotFoundError("Projekt nie istnieje.");
    }
  },

  /**
   * Sends the invitations by e-mail (the mailer), with NOTHING persisted. Deliberately a different
   * handler from CRUD — the proof that the form engine is separate from persistence (the wizard
   * sends some data to the database and some to the mailer).
   */
  async inviteMembers(db: Db, projectId: string, emails: string[], mailer: Mailer) {
    const project = await projectsRepository.findById(db, projectId);
    if (!project) {
      throw new NotFoundError("Projekt nie istnieje.");
    }
    await Promise.all(
      emails.map((to) =>
        mailer.send({
          to,
          subject: `Zaproszenie do projektu: ${project.name}`,
          text: `Zaproszono Cię do współpracy przy projekcie „${project.name}".`,
        }),
      ),
    );
    return { invited: emails.length };
  },
};
