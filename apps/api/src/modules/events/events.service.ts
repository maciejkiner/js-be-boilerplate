import { z } from "zod";
import type { Db } from "../../db/client.js";
import { uniqueViolationConstraint } from "../../db/unique-violation.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/http/problem.js";
import { paginate } from "../../lib/http/pagination.js";
import {
  type CreateEventSchema,
  type EventListQuery,
  type UpdateEventSchema,
} from "./events.dto.js";
import { venuesRepository } from "../venues/venues.repository.js";
import { eventsRepository } from "./events.repository.js";

type CreateInput = z.infer<typeof CreateEventSchema>;
type UpdateInput = z.infer<typeof UpdateEventSchema>;

async function assertRelations(db: Db, input: { venueId?: string | null }) {
  if (input.venueId) {
    const related = await venuesRepository.findById(db, input.venueId);
    if (!related) {
      throw new BadRequestError("Wskazana relacja (venueId) nie istnieje.");
    }
  }
}

const UNIQUE_FIELDS: Record<string, string> = {
  events_slug_key: "slug",
};

/** Naruszenie unikalności → 409 z nazwami pól; każdy inny błąd przechodzi dalej. */
function rethrowAsConflict(error: unknown): never {
  const constraint = uniqueViolationConstraint(error);
  const fields = constraint ? UNIQUE_FIELDS[constraint] : undefined;
  if (fields) {
    throw new ConflictError(`Event: wartości (${fields}) muszą być unikalne.`);
  }
  throw error;
}

/** Logika biznesowa events. Wygenerowane. */
export const eventsService = {
  async list(db: Db, query: EventListQuery) {
    const { items, total } = await eventsRepository.list(db, query);
    return paginate(items, total, query);
  },

  async getById(db: Db, id: string) {
    const row = await eventsRepository.findById(db, id);
    if (!row) {
      throw new NotFoundError("Event nie istnieje.");
    }
    return row;
  },

  async create(db: Db, input: CreateInput, createdById: string) {
    await assertRelations(db, input);
    return eventsRepository
      .create(db, { ...input, createdBy: createdById })
      .catch(rethrowAsConflict);
  },

  async update(db: Db, id: string, input: UpdateInput) {
    await assertRelations(db, input);
    const updated = await eventsRepository.update(db, id, input).catch(rethrowAsConflict);
    if (!updated) {
      throw new NotFoundError("Event nie istnieje.");
    }
    return updated;
  },

  async remove(db: Db, id: string) {
    const deleted = await eventsRepository.softDelete(db, id);
    if (!deleted) {
      throw new NotFoundError("Event nie istnieje.");
    }
  },
};
