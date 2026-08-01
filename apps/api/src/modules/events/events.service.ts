import { z } from "zod";
import type { Db } from "../../db/client.js";
import type { Mailer } from "../../lib/mailer/index.js";
import { uniqueConflictError, uniqueViolationConstraint } from "../../db/unique-violation.js";
import { BadRequestError, NotFoundError } from "../../lib/http/problem.js";
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

const UNIQUE_FIELDS: Record<string, string[]> = {
  events_slug_key: ["slug"],
};

/** A uniqueness violation → a 409 naming the fields; any other error passes through. */
function rethrowAsConflict(error: unknown): never {
  const constraint = uniqueViolationConstraint(error);
  const fields = constraint ? UNIQUE_FIELDS[constraint] : undefined;
  if (fields) {
    throw uniqueConflictError("Event", fields);
  }
  throw error;
}

/** Business logic for events. Generated. */
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

  /**
   * Speaker invitations: the content goes to the mailer and is persisted NOWHERE. Step 3 of the
   * wizard — the proof that the form engine is not tied to CRUD.
   */
  async inviteSpeakers(db: Db, eventId: string, emails: string[], mailer: Mailer) {
    const event = await eventsRepository.findById(db, eventId);
    if (!event) {
      throw new NotFoundError("Event nie istnieje.");
    }
    await Promise.all(
      emails.map((to) =>
        mailer.send({
          to,
          subject: `Zaproszenie do wystąpienia: ${event.name}`,
          text: `Zapraszamy do wystąpienia na wydarzeniu „${event.name}".`,
        }),
      ),
    );
    return { invited: emails.length };
  },

  async remove(db: Db, id: string) {
    const deleted = await eventsRepository.softDelete(db, id);
    if (!deleted) {
      throw new NotFoundError("Event nie istnieje.");
    }
  },
};
