import { z } from "zod";
import type { Db } from "../../db/client.js";
import { NotFoundError } from "../../lib/http/problem.js";
import { paginate } from "../../lib/http/pagination.js";
import {
  type CreateVenueSchema,
  type VenueListQuery,
  type UpdateVenueSchema,
} from "./venues.dto.js";
import { venuesRepository } from "./venues.repository.js";

type CreateInput = z.infer<typeof CreateVenueSchema>;
type UpdateInput = z.infer<typeof UpdateVenueSchema>;

/** Logika biznesowa venues. Wygenerowane. */
export const venuesService = {
  async list(db: Db, query: VenueListQuery) {
    const { items, total } = await venuesRepository.list(db, query);
    return paginate(items, total, query);
  },

  async getById(db: Db, id: string) {
    const row = await venuesRepository.findById(db, id);
    if (!row) {
      throw new NotFoundError("Venue nie istnieje.");
    }
    return row;
  },

  async create(db: Db, input: CreateInput, createdById: string) {
    return venuesRepository.create(db, { ...input, createdBy: createdById });
  },

  async update(db: Db, id: string, input: UpdateInput) {
    const updated = await venuesRepository.update(db, id, input);
    if (!updated) {
      throw new NotFoundError("Venue nie istnieje.");
    }
    return updated;
  },

  async remove(db: Db, id: string) {
    const deleted = await venuesRepository.softDelete(db, id);
    if (!deleted) {
      throw new NotFoundError("Venue nie istnieje.");
    }
  },
};
