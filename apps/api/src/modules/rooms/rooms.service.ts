import { z } from "zod";
import type { Db } from "../../db/client.js";
import { BadRequestError, NotFoundError } from "../../lib/http/problem.js";
import { paginate } from "../../lib/http/pagination.js";
import { type CreateRoomSchema, type RoomListQuery, type UpdateRoomSchema } from "./rooms.dto.js";
import { venuesRepository } from "../venues/venues.repository.js";
import { roomsRepository } from "./rooms.repository.js";

type CreateInput = z.infer<typeof CreateRoomSchema>;
type UpdateInput = z.infer<typeof UpdateRoomSchema>;

async function assertRelations(db: Db, input: { venueId?: string | null }) {
  if (input.venueId) {
    const related = await venuesRepository.findById(db, input.venueId);
    if (!related) {
      throw new BadRequestError("Wskazana relacja (venueId) nie istnieje.");
    }
  }
}

/** Logika biznesowa rooms. Wygenerowane. */
export const roomsService = {
  async list(db: Db, query: RoomListQuery) {
    const { items, total } = await roomsRepository.list(db, query);
    return paginate(items, total, query);
  },

  async getById(db: Db, id: string) {
    const row = await roomsRepository.findById(db, id);
    if (!row) {
      throw new NotFoundError("Room nie istnieje.");
    }
    return row;
  },

  async create(db: Db, input: CreateInput, createdById: string) {
    await assertRelations(db, input);
    return roomsRepository.create(db, { ...input, createdBy: createdById });
  },

  async update(db: Db, id: string, input: UpdateInput) {
    await assertRelations(db, input);
    const updated = await roomsRepository.update(db, id, input);
    if (!updated) {
      throw new NotFoundError("Room nie istnieje.");
    }
    return updated;
  },

  async remove(db: Db, id: string) {
    const deleted = await roomsRepository.softDelete(db, id);
    if (!deleted) {
      throw new NotFoundError("Room nie istnieje.");
    }
  },
};
