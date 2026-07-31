import { z } from "zod";
import type { Db } from "../../db/client.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnprocessableEntityError,
} from "../../lib/http/problem.js";
import { paginate } from "../../lib/http/pagination.js";
import {
  type CreateTalkInEventSchema,
  type CreateTalkSchema,
  type TalkListQuery,
  type UpdateTalkSchema,
} from "./talks.dto.js";
import { eventsRepository } from "../events/events.repository.js";
import { roomsRepository } from "../rooms/rooms.repository.js";
import { talksRepository } from "./talks.repository.js";
import { intervalContains, intervalsOverlap } from "./talks.rules.js";

type CreateInput = z.infer<typeof CreateTalkSchema>;
type UpdateInput = z.infer<typeof UpdateTalkSchema>;
type CreateInEventInput = z.infer<typeof CreateTalkInEventSchema>;

/** Komplet wartości potrzebnych do sprawdzenia reguł czasowych (po scaleniu przy edycji). */
interface ScheduledTalk {
  eventId: string;
  roomId: string;
  startsAt: Date;
  endsAt: Date;
}

interface ScheduleCheckOptions {
  /** Id edytowanej prelekcji — wykluczane z wyszukiwania kolizji, by nie kolidowała sama ze sobą. */
  exceptId?: string;
  /** Prefiks komunikatów, np. „Prelekcja 2" — przy tworzeniu hurtem wskazuje pozycję w paczce. */
  label?: string;
}

/**
 * Reguły domenowe prelekcji. Wymagają odczytu innych rekordów, więc NIE mogą żyć w schemacie Zod
 * (ten widzi wyłącznie payload i jest współdzielony z frontendem) — patrz `docs/dx-pilot/conference.md`.
 */
async function assertSchedule(
  db: Db,
  values: ScheduledTalk,
  { exceptId, label }: ScheduleCheckOptions = {},
): Promise<void> {
  const prefix = label ? `${label}: ` : "";
  // Kolejność sprawdzeń: najpierw istnienie relacji, potem reguły — inaczej pytalibyśmy o okno
  // czasowe nieistniejącego wydarzenia.
  const event = await eventsRepository.findById(db, values.eventId);
  if (!event) {
    throw new BadRequestError(`${prefix}wskazana relacja (eventId) nie istnieje.`);
  }
  const room = await roomsRepository.findById(db, values.roomId);
  if (!room) {
    throw new BadRequestError(`${prefix}wskazana relacja (roomId) nie istnieje.`);
  }

  // `UpdateTalkSchema` to `schema.partial()`, więc międzypolowy `refine` encji NIE obowiązuje przy
  // PATCH — porządek godzin sprawdzamy tutaj, żeby obie ścieżki zachowywały się tak samo.
  if (values.endsAt <= values.startsAt) {
    throw new UnprocessableEntityError(
      `${prefix}koniec prelekcji musi być późniejszy niż jej początek.`,
    );
  }

  if (!intervalContains(event, values)) {
    throw new UnprocessableEntityError(
      `${prefix}prelekcja musi mieścić się w oknie czasowym wydarzenia.`,
      {
        eventStartsAt: event.startsAt,
        eventEndsAt: event.endsAt,
      },
    );
  }

  // `event.venueId` jest opcjonalny (wymagany dopiero przy publikacji) — dopóki wydarzenie nie ma
  // obiektu, nie ma czego pilnować.
  if (event.venueId && room.venueId !== event.venueId) {
    throw new UnprocessableEntityError(
      `${prefix}sala musi należeć do obiektu, w którym odbywa się wydarzenie.`,
    );
  }

  const clash = await talksRepository.findOverlappingInRoom(db, { ...values, exceptId });
  if (clash) {
    throw new ConflictError(
      `${prefix}sala jest w tym czasie zajęta przez prelekcję „${clash.title}".`,
    );
  }
}

/** Logika biznesowa talks. Wygenerowane przez scaffolder + reguły czasowe (dopisane ręcznie). */
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
    await assertSchedule(db, input);
    return talksRepository.create(db, { ...input, createdBy: createdById });
  },

  /**
   * Tworzy wiele prelekcji jednego wydarzenia naraz (krok „agenda" kreatora).
   *
   * Semantyka **wszystko albo nic**: najpierw sprawdzamy reguły dla każdej pozycji, dopiero potem
   * jeden `INSERT`. Dzięki temu paczka z jedną kolizją nie zostawia połowy prelekcji w bazie.
   * Kolizje liczone są w dwóch miejscach, bo mają dwa różne źródła: SQL widzi rekordy już zapisane,
   * a pętla poniżej — pozycje z tej samej paczki, których w bazie jeszcze nie ma.
   */
  async createManyForEvent(
    db: Db,
    eventId: string,
    inputs: CreateInEventInput[],
    createdById: string,
  ) {
    const event = await eventsRepository.findById(db, eventId);
    if (!event) {
      throw new NotFoundError("Event nie istnieje.");
    }

    const accepted: ScheduledTalk[] = [];
    const values = inputs.map((input, index) => {
      const candidate = { ...input, eventId };
      const label = `Prelekcja ${index + 1} („${input.title}")`;
      return { candidate, label };
    });

    for (const { candidate, label } of values) {
      await assertSchedule(db, candidate, { label });
      const clash = accepted.find(
        (earlier) => earlier.roomId === candidate.roomId && intervalsOverlap(earlier, candidate),
      );
      if (clash) {
        throw new ConflictError(`${label}: koliduje z inną prelekcją z tej samej paczki.`);
      }
      accepted.push(candidate);
    }

    return talksRepository.createMany(
      db,
      values.map(({ candidate }) => ({ ...candidate, createdBy: createdById })),
    );
  },

  async update(db: Db, id: string, input: UpdateInput) {
    // PATCH jest częściowy, więc reguły sprawdzamy na wartościach PO scaleniu z bieżącym rekordem —
    // sama zmiana sali musi być weryfikowana względem dotychczasowych godzin.
    const current = await talksRepository.findById(db, id);
    if (!current) {
      throw new NotFoundError("Talk nie istnieje.");
    }
    await assertSchedule(
      db,
      {
        eventId: input.eventId ?? current.eventId,
        roomId: input.roomId ?? current.roomId,
        startsAt: input.startsAt ?? current.startsAt,
        endsAt: input.endsAt ?? current.endsAt,
      },
      { exceptId: id },
    );

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
