import { z } from "zod";
import type { Db } from "../../db/client.js";
import { BadRequestError, NotFoundError } from "../../lib/http/problem.js";
import { paginate } from "../../lib/http/pagination.js";
import { type CreateTalkSchema, type TalkListQuery, type UpdateTalkSchema } from "./talks.dto.js";
import { eventsRepository } from "../events/events.repository.js";
import { roomsRepository } from "../rooms/rooms.repository.js";
import { talksRepository } from "./talks.repository.js";

type CreateInput = z.infer<typeof CreateTalkSchema>;
type UpdateInput = z.infer<typeof UpdateTalkSchema>;

async function assertRelations(db: Db, input: { eventId?: string | null; roomId?: string | null }) {
  if (input.eventId) {
    const related = await eventsRepository.findById(db, input.eventId);
    if (!related) {
      throw new BadRequestError("Wskazana relacja (eventId) nie istnieje.");
    }
  }
  if (input.roomId) {
    const related = await roomsRepository.findById(db, input.roomId);
    if (!related) {
      throw new BadRequestError("Wskazana relacja (roomId) nie istnieje.");
    }
  }
}

/** Logika biznesowa talks. Wygenerowane. */
export const talksService = {
  async list(db: Db, query: TalkListQuery) {
    const { items, total } = await talksRepository.list(db, query);
    return paginate(items, total, query);
  },

  async getById(db: Db, id: string) {
    const row = await talksRepository.findById(db, id);
    if (!row) {
      throw new NotFoundError("Talk nie istnieje.");
    }
    return row;
  },

  async create(db: Db, input: CreateInput, createdById: string) {
    await assertRelations(db, input);
    return talksRepository.create(db, { ...input, createdBy: createdById });
  },

  async update(db: Db, id: string, input: UpdateInput) {
    await assertRelations(db, input);
    const updated = await talksRepository.update(db, id, input);
    if (!updated) {
      throw new NotFoundError("Talk nie istnieje.");
    }
    return updated;
  },

  async remove(db: Db, id: string) {
    const deleted = await talksRepository.softDelete(db, id);
    if (!deleted) {
      throw new NotFoundError("Talk nie istnieje.");
    }
  },
};
