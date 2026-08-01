import {
  type CreateEventBody,
  useCreateEvent,
  useCreateEventTalks,
  useInviteEventSpeakers,
  useRooms,
} from "@repo/api-react";
import { Button, Input, Select, Textarea, useToast } from "@repo/design-system";
import { WizardStepError } from "@repo/forms";
import { deriveFields, emptyValues, FormFields, Wizard } from "@repo/forms-ui";
import type { WizardStepConfig } from "@repo/forms-ui";
import { eventEntity, talkEntity } from "@repo/schemas";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { z } from "zod";
import { useRelationSource } from "../relation-source";
import { Page } from "../ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** `unwrap` throws `ApiError`, so `message` carries the `detail` from problem+json (the user-facing text). */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Żądanie do API nie powiodło się.";
}

function parseEmails(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .map((value) => value.trim())
    .filter((value) => EMAIL_RE.test(value));
}

// The options come from the ENTITY, not from literals — otherwise they drift when `talkEntity`
// changes. The `?? []` is required because `entity.fields` has the union type `FieldMeta`: the
// compiler does not know these particular fields are closed lists, though the builder did.
const TRACK_OPTIONS = talkEntity.fields.track.options ?? [];
const LEVEL_OPTIONS = talkEntity.fields.level.options ?? [];

/** An agenda row in the wizard state — raw field values, converted only when submitting. */
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
 * The "agenda" step keeps its rows in local state, because `FormFields` renders a SINGLE entity
 * record while here we need N talks at once. This is exactly where the form engine ends and a
 * hand-written view begins.
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
 * The "create an event" wizard (P1). `onComplete` orchestrates THREE handlers with different targets:
 * the event → the database, the agenda → one bulk request, invitations → the mailer (not persisted).
 */
export function CreateEventWizard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createEvent = useCreateEvent();
  const createTalks = useCreateEventTalks();
  const invite = useInviteEventSpeakers();
  const relationSource = useRelationSource();

  const [rows, setRows] = useState<AgendaRow[]>([emptyRow()]);
  // The event is created in the first phase of the orchestration. If a later phase fails, pressing
  // "Utwórz" again must NOT create it a second time — `slug` is unique, so the second attempt would
  // get a 409 instead of retrying the step that actually failed.
  const createdEventId = useRef<string | null>(null);
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
      // The agenda rows live outside the wizard state, so this step has nothing to validate with a
      // schema — the API verifies the full set of rules (the event window, room clashes) anyway.
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
            // 1) the event → the database (skipped on a retry — see `createdEventId`)
            if (!createdEventId.current) {
              try {
                const event = await createEvent.mutateAsync(values as unknown as CreateEventBody);
                createdEventId.current = event.id;
              } catch (error) {
                throw new WizardStepError("event", messageOf(error));
              }
            }
            const eventId = createdEventId.current;

            // 2) the agenda → ONE bulk request (all-or-nothing)
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
              try {
                await createTalks.mutateAsync({
                  id: eventId,
                  talks: talks as Parameters<typeof createTalks.mutateAsync>[0]["talks"],
                });
              } catch (error) {
                // The domain rules (the event window, room clashes) concern the "agenda" step's
                // data, so we send the user back there together with the server's message.
                throw new WizardStepError("agenda", messageOf(error));
              }
            }

            // 3) invitations → the mailer (NOT the database)
            const emails = parseEmails((values.inviteEmailsText as string) ?? "");
            if (emails.length > 0) {
              try {
                await invite.mutateAsync({ id: eventId, emails });
              } catch (error) {
                throw new WizardStepError("invite", messageOf(error));
              }
            }

            toast("Utworzono wydarzenie wraz z agendą i zaproszeniami.", "success");
            navigate({ to: "/events/$id", params: { id: eventId } });
          }}
        />
      </div>
    </Page>
  );
}
