import { z } from "zod";
import type { Db } from "../../db/client.js";
import { uniqueConflictError, uniqueViolationConstraint } from "../../db/unique-violation.js";
import { BadRequestError, NotFoundError } from "../../lib/http/problem.js";
import { paginate } from "../../lib/http/pagination.js";
import {
  type CreateRegistrationSchema,
  type RegistrationListQuery,
  type UpdateRegistrationSchema,
} from "./registrations.dto.js";
import { eventsRepository } from "../events/events.repository.js";
import { registrationsRepository } from "./registrations.repository.js";

type CreateInput = z.infer<typeof CreateRegistrationSchema>;
type UpdateInput = z.infer<typeof UpdateRegistrationSchema>;

async function assertRelations(db: Db, input: { eventId?: string | null }) {
  if (input.eventId) {
    const related = await eventsRepository.findById(db, input.eventId);
    if (!related) {
      throw new BadRequestError("Wskazana relacja (eventId) nie istnieje.");
    }
  }
}

const UNIQUE_FIELDS: Record<string, string[]> = {
  registrations_event_id_email_key: ["eventId", "email"],
};

/** A uniqueness violation → a 409 naming the fields; any other error passes through. */
function rethrowAsConflict(error: unknown): never {
  const constraint = uniqueViolationConstraint(error);
  const fields = constraint ? UNIQUE_FIELDS[constraint] : undefined;
  if (fields) {
    throw uniqueConflictError("Registration", fields);
  }
  throw error;
}

/** Business logic for registrations. Generated. */
export const registrationsService = {
  async list(db: Db, query: RegistrationListQuery) {
    const { items, total } = await registrationsRepository.list(db, query);
    return paginate(items, total, query);
  },

  async getById(db: Db, id: string) {
    const row = await registrationsRepository.findById(db, id);
    if (!row) {
      throw new NotFoundError("Registration nie istnieje.");
    }
    return row;
  },

  async create(db: Db, input: CreateInput, createdById: string) {
    await assertRelations(db, input);
    return registrationsRepository
      .create(db, { ...input, createdBy: createdById })
      .catch(rethrowAsConflict);
  },

  async update(db: Db, id: string, input: UpdateInput) {
    await assertRelations(db, input);
    const updated = await registrationsRepository.update(db, id, input).catch(rethrowAsConflict);
    if (!updated) {
      throw new NotFoundError("Registration nie istnieje.");
    }
    return updated;
  },

  async remove(db: Db, id: string) {
    const deleted = await registrationsRepository.softDelete(db, id);
    if (!deleted) {
      throw new NotFoundError("Registration nie istnieje.");
    }
  },
};
