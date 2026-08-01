import { z } from "zod";
import type { Db } from "../../db/client.js";
import { NotFoundError } from "../../lib/http/problem.js";
import { paginate } from "../../lib/http/pagination.js";
import {
  type CreateSpeakerSchema,
  type SpeakerListQuery,
  type UpdateSpeakerSchema,
} from "./speakers.dto.js";
import { speakersRepository } from "./speakers.repository.js";

type CreateInput = z.infer<typeof CreateSpeakerSchema>;
type UpdateInput = z.infer<typeof UpdateSpeakerSchema>;

/** Business logic for speakers. Generated. */
export const speakersService = {
  async list(db: Db, query: SpeakerListQuery) {
    const { items, total } = await speakersRepository.list(db, query);
    return paginate(items, total, query);
  },

  async getById(db: Db, id: string) {
    const row = await speakersRepository.findById(db, id);
    if (!row) {
      throw new NotFoundError("Speaker nie istnieje.");
    }
    return row;
  },

  async create(db: Db, input: CreateInput, createdById: string) {
    return speakersRepository.create(db, { ...input, createdBy: createdById });
  },

  async update(db: Db, id: string, input: UpdateInput) {
    const updated = await speakersRepository.update(db, id, input);
    if (!updated) {
      throw new NotFoundError("Speaker nie istnieje.");
    }
    return updated;
  },

  async remove(db: Db, id: string) {
    const deleted = await speakersRepository.softDelete(db, id);
    if (!deleted) {
      throw new NotFoundError("Speaker nie istnieje.");
    }
  },
};
