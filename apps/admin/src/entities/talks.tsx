import {
  type TalkList,
  type TalkListQuery,
  type CreateTalkBody,
  type UpdateTalkBody,
  useCreateTalk,
  useDeleteTalk,
  useUpdateTalk,
  useTalk,
  useTalks,
} from "@repo/api-react";
import { Badge, Button, Modal, Select, useToast } from "@repo/design-system";
import { emptyValues } from "@repo/forms-ui";
import { talkEntity } from "@repo/schemas";
import { type Column, DataTable, type SortState } from "@repo/ui";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useRelationSource } from "../relation-source";
import { formatDateTime, Page } from "../ui";
import { EntityForm, recordToFormValues } from "./entity-form";

type TalkRow = TalkList["items"][number];

export function TalksList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [track, setTrack] = useState("");
  const [level, setLevel] = useState("");
  const [sort, setSort] = useState<SortState>({ column: "createdAt", order: "desc" });

  const query = useTalks({
    page,
    track: (track || undefined) as TalkListQuery["track"],
    level: (level || undefined) as TalkListQuery["level"],
    sort: sort.column as TalkListQuery["sort"],
    order: sort.order,
  });

  const columns: Column<TalkRow>[] = [
    { key: "title", header: "Title", sortable: true },
    { key: "track", header: "Track", render: (row) => <Badge>{row.track}</Badge> },
    { key: "level", header: "Level", render: (row) => <Badge>{row.level}</Badge> },
    {
      key: "startsAt",
      header: "Starts at",
      sortable: true,
      render: (row) => formatDateTime(row.startsAt),
    },
    { key: "endsAt", header: "Ends at", render: (row) => formatDateTime(row.endsAt) },
    { key: "isRecorded", header: "Is recorded", render: (row) => (row.isRecorded ? "Tak" : "Nie") },
    { key: "eventId", header: "Event", render: (row) => row.eventId ?? "—" },
    { key: "roomId", header: "Room", render: (row) => row.roomId ?? "—" },
  ];

  return (
    <Page
      title="Talks"
      actions={
        <Button variant="secondary" onClick={() => navigate({ to: "/talks/new" })}>
          Nowy: Talk
        </Button>
      }
    >
      <DataTable
        columns={columns}
        rows={query.data?.items ?? []}
        getRowId={(row) => row.id}
        isLoading={query.isLoading}
        error={query.error}
        sort={sort}
        onSortChange={(next) => {
          setSort(next);
          setPage(1);
        }}
        pagination={query.data?.meta}
        onPageChange={setPage}
        onRowClick={(row) => navigate({ to: "/talks/$id", params: { id: row.id } })}
        toolbar={
          <>
            <Select
              aria-label="Filtr: Track"
              placeholder="Wszystkie: Track"
              options={[
                { value: "product", label: "Product" },
                { value: "engineering", label: "Engineering" },
                { value: "design", label: "Design" },
                { value: "business", label: "Business" },
              ]}
              value={track}
              onChange={(event) => {
                setTrack(event.target.value);
                setPage(1);
              }}
            />
            <Select
              aria-label="Filtr: Level"
              placeholder="Wszystkie: Level"
              options={[
                { value: "intro", label: "Intro" },
                { value: "intermediate", label: "Intermediate" },
                { value: "advanced", label: "Advanced" },
              ]}
              value={level}
              onChange={(event) => {
                setLevel(event.target.value);
                setPage(1);
              }}
            />
          </>
        }
      />
    </Page>
  );
}

export function TalkDetail() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { toast } = useToast();
  const remove = useDeleteTalk();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const query = useTalk(id ?? "");

  if (query.isLoading) {
    return <Page title="Talk">Ładowanie…</Page>;
  }
  if (query.isError || !query.data) {
    return <Page title="Talk">Nie znaleziono.</Page>;
  }

  const row = query.data;
  return (
    <Page
      title={String(row.title)}
      actions={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate({ to: "/talks/$id/edit", params: { id: row.id } })}
          >
            Edytuj
          </Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Usuń
          </Button>
        </div>
      }
    >
      <dl className="grid max-w-lg grid-cols-[10rem_1fr] gap-y-2 text-sm">
        <dt className="text-slate-500">Title</dt>
        <dd className="text-slate-800">{row.title ?? "—"}</dd>
        <dt className="text-slate-500">Abstract</dt>
        <dd className="text-slate-800">{row.abstract ?? "—"}</dd>
        <dt className="text-slate-500">Track</dt>
        <dd className="text-slate-800">
          <Badge>{row.track}</Badge>
        </dd>
        <dt className="text-slate-500">Level</dt>
        <dd className="text-slate-800">
          <Badge>{row.level}</Badge>
        </dd>
        <dt className="text-slate-500">Starts at</dt>
        <dd className="text-slate-800">{formatDateTime(row.startsAt)}</dd>
        <dt className="text-slate-500">Ends at</dt>
        <dd className="text-slate-800">{formatDateTime(row.endsAt)}</dd>
        <dt className="text-slate-500">Is recorded</dt>
        <dd className="text-slate-800">{row.isRecorded ? "Tak" : "Nie"}</dd>
        <dt className="text-slate-500">Event</dt>
        <dd className="text-slate-800">{row.eventId ?? "—"}</dd>
        <dt className="text-slate-500">Room</dt>
        <dd className="text-slate-800">{row.roomId ?? "—"}</dd>
      </dl>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Usunąć?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Anuluj
            </Button>
            <Button
              variant="danger"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(row.id, {
                  onSuccess: () => {
                    toast("Usunięto.", "success");
                    navigate({ to: "/talks" });
                  },
                  onError: () => toast("Nie udało się usunąć.", "error"),
                })
              }
            >
              Usuń
            </Button>
          </>
        }
      >
        Operacja miękka (soft delete).
      </Modal>
    </Page>
  );
}

export function TalkCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const create = useCreateTalk();
  const relationSource = useRelationSource();

  return (
    <Page title="Nowy: Talk">
      <EntityForm
        entity={talkEntity}
        defaultValues={emptyValues(talkEntity)}
        submitLabel="Utwórz"
        relationSource={relationSource}
        onSubmit={async (values) => {
          try {
            const created = await create.mutateAsync(values as CreateTalkBody);
            toast("Utworzono.", "success");
            navigate({ to: "/talks/$id", params: { id: created.id } });
          } catch {
            toast("Nie udało się utworzyć.", "error");
          }
        }}
      />
    </Page>
  );
}

export function TalkEdit() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { toast } = useToast();
  const update = useUpdateTalk();
  const relationSource = useRelationSource();
  const query = useTalk(id ?? "");

  if (query.isLoading) {
    return <Page title="Edycja">Ładowanie…</Page>;
  }
  if (query.isError || !query.data) {
    return <Page title="Edycja">Nie znaleziono.</Page>;
  }

  const row = query.data;
  return (
    <Page title={`Edycja: ${String(row.title)}`}>
      <EntityForm
        entity={talkEntity}
        defaultValues={recordToFormValues(talkEntity, row)}
        submitLabel="Zapisz"
        relationSource={relationSource}
        onSubmit={async (values) => {
          try {
            await update.mutateAsync({ id: row.id, body: values as UpdateTalkBody });
            toast("Zapisano.", "success");
            navigate({ to: "/talks/$id", params: { id: row.id } });
          } catch {
            toast("Nie udało się zapisać.", "error");
          }
        }}
      />
    </Page>
  );
}
