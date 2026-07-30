import { z } from "zod";
import type { Db } from "../../db/client.js";
import { uniqueViolationConstraint } from "../../db/unique-violation.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/http/problem.js";
import { paginate } from "../../lib/http/pagination.js";
import {
  type CreateTalkSpeakerSchema,
  type TalkSpeakerListQuery,
  type UpdateTalkSpeakerSchema,
} from "./talk-speakers.dto.js";
import { talksRepository } from "../talks/talks.repository.js";
import { speakersRepository } from "../speakers/speakers.repository.js";
import { talkSpeakersRepository } from "./talk-speakers.repository.js";

type CreateInput = z.infer<typeof CreateTalkSpeakerSchema>;
type UpdateInput = z.infer<typeof UpdateTalkSpeakerSchema>;

async function assertRelations(
  db: Db,
  input: { talkId?: string | null; speakerId?: string | null },
) {
  if (input.talkId) {
    const related = await talksRepository.findById(db, input.talkId);
    if (!related) {
      throw new BadRequestError("Wskazana relacja (talkId) nie istnieje.");
    }
  }
  if (input.speakerId) {
    const related = await speakersRepository.findById(db, input.speakerId);
    if (!related) {
      throw new BadRequestError("Wskazana relacja (speakerId) nie istnieje.");
    }
  }
}

const UNIQUE_FIELDS: Record<string, string> = {
  talk_speakers_talk_id_speaker_id_key: "talkId, speakerId",
};

/** Naruszenie unikalności → 409 z nazwami pól; każdy inny błąd przechodzi dalej. */
function rethrowAsConflict(error: unknown): never {
  const constraint = uniqueViolationConstraint(error);
  const fields = constraint ? UNIQUE_FIELDS[constraint] : undefined;
  if (fields) {
    throw new ConflictError(`Talk speaker: wartości (${fields}) muszą być unikalne.`);
  }
  throw error;
}

/** Logika biznesowa talkSpeakers. Wygenerowane. */
export const talkSpeakersService = {
  async list(db: Db, query: TalkSpeakerListQuery) {
    const { items, total } = await talkSpeakersRepository.list(db, query);
    return paginate(items, total, query);
  },

  async getById(db: Db, id: string) {
    const row = await talkSpeakersRepository.findById(db, id);
    if (!row) {
      throw new NotFoundError("Talk speaker nie istnieje.");
    }
    return row;
  },

  async create(db: Db, input: CreateInput, createdById: string) {
    await assertRelations(db, input);
    return talkSpeakersRepository
      .create(db, { ...input, createdBy: createdById })
      .catch(rethrowAsConflict);
  },

  async update(db: Db, id: string, input: UpdateInput) {
    await assertRelations(db, input);
    const updated = await talkSpeakersRepository.update(db, id, input).catch(rethrowAsConflict);
    if (!updated) {
      throw new NotFoundError("Talk speaker nie istnieje.");
    }
    return updated;
  },

  async remove(db: Db, id: string) {
    const deleted = await talkSpeakersRepository.softDelete(db, id);
    if (!deleted) {
      throw new NotFoundError("Talk speaker nie istnieje.");
    }
  },
};
