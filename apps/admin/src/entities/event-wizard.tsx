import {
  type CreateEventBody,
  useCreateEvent,
  useCreateEventTalks,
  useInviteEventSpeakers,
  useRooms,
} from "@repo/api-react";
import { Button, Input, Select, Textarea, useToast } from "@repo/design-system";
import { deriveFields, emptyValues, FormFields, Wizard } from "@repo/forms-ui";
import type { WizardStepConfig } from "@repo/forms-ui";
import { eventEntity, talkEntity } from "@repo/schemas";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useRelationSource } from "../relation-source";
import { Page } from "../ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmails(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .map((value) => value.trim())
    .filter((value) => EMAIL_RE.test(value));
}

// Opcje bierzemy z ENCJI, nie z literałów — inaczej rozjadą się przy zmianie `talkEntity`.
// `?? []` jest konieczne, bo `entity.fields` ma typ unii `FieldMeta`: kompilator nie wie, że akurat
// te pola są listami zamkniętymi, choć builder to wiedział w momencie deklaracji.
const TRACK_OPTIONS = talkEntity.fields.track.options ?? [];
const LEVEL_OPTIONS = talkEntity.fields.level.options ?? [];

/** Wiersz agendy w stanie kreatora — surowe wartości z pól, konwersja dopiero przy wysyłce. */
interface AgendaRow {
  title: string;
  roomId: string;
  track: string;
  level: string;
  startsAt: string;
  endsAt: string;
}

const emptyRow = (): AgendaRow => ({
  title: "",
  roomId: "",
  track: TRACK_OPTIONS[0]?.value ?? "",
  level: LEVEL_OPTIONS[0]?.value ?? "",
  startsAt: "",
  endsAt: "",
});

/**
 * Krok „agenda" trzyma listę wierszy w stanie lokalnym, bo `FormFields` renderuje POJEDYNCZY rekord
 * encji, a tutaj potrzebujemy N prelekcji naraz. To jest właśnie miejsce, w którym silnik formularzy
 * się kończy, a zaczyna widok pisany ręcznie.
 */
function AgendaStep({
  rows,
  onChange,
  rooms,
}: {
  rows: AgendaRow[];
  onChange: (rows: AgendaRow[]) => void;
  rooms: { value: string; label: string }[];
}) {
  const patch = (index: number, values: Partial<AgendaRow>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...values } : row)));

  return (
    <div className="flex flex-col gap-4">
      {rows.map((row, index) => (
        <fieldset key={index} className="flex flex-col gap-2 rounded border border-slate-200 p-3">
          <legend className="px-1 text-sm font-medium text-slate-700">Prelekcja {index + 1}</legend>
          <Input
            aria-label={`Tytuł prelekcji ${index + 1}`}
            placeholder="Tytuł"
            value={row.title}
            onChange={(event) => patch(index, { title: event.target.value })}
          />
          <Select
            aria-label={`Sala prelekcji ${index + 1}`}
            placeholder="Wybierz salę"
            options={rooms}
            value={row.roomId}
            onChange={(event) => patch(index, { roomId: event.target.value })}
          />
          <div className="flex gap-2">
            <Select
              aria-label={`Ścieżka prelekcji ${index + 1}`}
              options={TRACK_OPTIONS}
              value={row.track}
              onChange={(event) => patch(index, { track: event.target.value })}
            />
            <Select
              aria-label={`Poziom prelekcji ${index + 1}`}
              options={LEVEL_OPTIONS}
              value={row.level}
              onChange={(event) => patch(index, { level: event.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Input
              aria-label={`Początek prelekcji ${index + 1}`}
              type="datetime-local"
              value={row.startsAt}
              onChange={(event) => patch(index, { startsAt: event.target.value })}
            />
            <Input
              aria-label={`Koniec prelekcji ${index + 1}`}
              type="datetime-local"
              value={row.endsAt}
              onChange={(event) => patch(index, { endsAt: event.target.value })}
            />
          </div>
          {rows.length > 1 && (
            <Button
              variant="secondary"
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
            >
              Usuń prelekcję {index + 1}
            </Button>
          )}
        </fieldset>
      ))}
      <Button variant="secondary" onClick={() => onChange([...rows, emptyRow()])}>
        Dodaj prelekcję
      </Button>
    </div>
  );
}

/**
 * Kreator „utwórz wydarzenie" (P1). `onComplete` orkiestruje TRZY handlery o różnych celach:
 * wydarzenie → baza, agenda → jedno żądanie hurtowe, zaproszenia → mailer (bez zapisu).
 */
export function CreateEventWizard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createEvent = useCreateEvent();
  const createTalks = useCreateEventTalks();
  const invite = useInviteEventSpeakers();
  const relationSource = useRelationSource();

  const [rows, setRows] = useState<AgendaRow[]>([emptyRow()]);
  const roomsQuery = useRooms({ pageSize: 50 });
  const rooms = (roomsQuery.data?.items ?? []).map((room) => ({
    value: room.id,
    label: room.name,
  }));

  const steps: WizardStepConfig<Record<string, unknown>>[] = [
    {
      id: "event",
      label: "Dane wydarzenia",
      schema: eventEntity.validation,
      render: (wizard) => (
        <FormFields
          fields={deriveFields(eventEntity)}
          form={wizard}
          relationSource={relationSource}
        />
      ),
    },
    {
      id: "agenda",
      label: "Agenda",
      // Wiersze agendy żyją poza stanem wizarda, więc krok nie ma czego walidować schematem —
      // komplet reguł (okno wydarzenia, kolizje sal) i tak weryfikuje API.
      schema: z.object({}),
      render: () => <AgendaStep rows={rows} onChange={setRows} rooms={rooms} />,
    },
    {
      id: "invite",
      label: "Zaproszenia prelegentów",
      schema: z.object({ inviteEmailsText: z.string().optional() }),
      render: (wizard) => (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-slate-700">
            E-maile prelegentów (po przecinku lub w liniach) — trafiają do mailera, nie do bazy
          </span>
          <Textarea
            value={(wizard.values.inviteEmailsText as string) ?? ""}
            onChange={(event) => wizard.setValue("inviteEmailsText", event.target.value)}
          />
        </label>
      ),
    },
  ];

  return (
    <Page title="Utwórz wydarzenie (kreator)">
      <div className="max-w-lg">
        <Wizard<Record<string, unknown>>
          steps={steps}
          defaultValues={{ ...emptyValues(eventEntity), inviteEmailsText: "" }}
          labels={{ next: "Dalej", submit: "Utwórz" }}
          onComplete={async (values) => {
            try {
              // 1) wydarzenie → baza
              const event = await createEvent.mutateAsync(values as unknown as CreateEventBody);

              // 2) agenda → JEDNO żądanie hurtowe („wszystko albo nic")
              const talks = rows
                .filter((row) => row.title && row.roomId && row.startsAt && row.endsAt)
                .map((row) => ({
                  title: row.title,
                  roomId: row.roomId,
                  track: row.track,
                  level: row.level,
                  startsAt: new Date(row.startsAt).toISOString(),
                  endsAt: new Date(row.endsAt).toISOString(),
                  isRecorded: false,
                }));
              if (talks.length > 0) {
                await createTalks.mutateAsync({
                  id: event.id,
                  talks: talks as Parameters<typeof createTalks.mutateAsync>[0]["talks"],
                });
              }

              // 3) zaproszenia → mailer (NIE do bazy)
              const emails = parseEmails((values.inviteEmailsText as string) ?? "");
              if (emails.length > 0) {
                await invite.mutateAsync({ id: event.id, emails });
              }

              toast("Utworzono wydarzenie wraz z agendą i zaproszeniami.", "success");
              navigate({ to: "/events/$id", params: { id: event.id } });
            } catch (error) {
              // Reguły domenowe (kolizja sal, okno wydarzenia) wracają z API jako 409/422 —
              // pokazujemy komunikat serwera, bo wskazuje konkretną pozycję agendy.
              toast(
                error instanceof Error ? error.message : "Nie udało się ukończyć kreatora.",
                "error",
              );
            }
          }}
        />
      </div>
    </Page>
  );
}
