import {
  type EventList,
  type EventListQuery,
  type CreateEventBody,
  type UpdateEventBody,
  useCreateEvent,
  useDeleteEvent,
  useUpdateEvent,
  useEvent,
  useEvents,
} from "@repo/api-react";
import { Badge, Button, Modal, Select, useToast } from "@repo/design-system";
import { emptyValues } from "@repo/forms-ui";
import { eventEntity } from "@repo/schemas";
import { type Column, DataTable, type SortState } from "@repo/ui";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useRelationSource } from "../relation-source";
import { formatDateTime, Page } from "../ui";
import { EntityForm, recordToFormValues } from "./entity-form";

type EventRow = EventList["items"][number];

export function EventsList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<SortState>({ column: "createdAt", order: "desc" });

  const query = useEvents({
    page,
    status: (status || undefined) as EventListQuery["status"],
    sort: sort.column as EventListQuery["sort"],
    order: sort.order,
  });

  const columns: Column<EventRow>[] = [
    { key: "name", header: "Name", sortable: true },
    { key: "slug", header: "Slug" },
    {
      key: "startsAt",
      header: "Starts at",
      sortable: true,
      render: (row) => formatDateTime(row.startsAt),
    },
    {
      key: "endsAt",
      header: "Ends at",
      sortable: true,
      render: (row) => formatDateTime(row.endsAt),
    },
    { key: "status", header: "Status", render: (row) => <Badge>{row.status}</Badge> },
    { key: "isPublic", header: "Public", render: (row) => (row.isPublic ? "Tak" : "Nie") },
    { key: "capacity", header: "Capacity" },
    { key: "venueId", header: "Venue", render: (row) => row.venueId ?? "—" },
  ];

  return (
    <Page
      title="Events"
      actions={
        // Dopisane ręcznie do wygenerowanego widoku: scaffolder nie wie o kreatorach.
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate({ to: "/events/new" })}>
            Nowy: Event
          </Button>
          <Button onClick={() => navigate({ to: "/events/wizard" })}>Kreator</Button>
        </div>
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
        onRowClick={(row) => navigate({ to: "/events/$id", params: { id: row.id } })}
        toolbar={
          <>
            <Select
              aria-label="Filtr: Status"
              placeholder="Wszystkie: Status"
              options={[
                { value: "draft", label: "Draft" },
                { value: "published", label: "Published" },
                { value: "cancelled", label: "Cancelled" },
              ]}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            />
          </>
        }
      />
    </Page>
  );
}

export function EventDetail() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { toast } = useToast();
  const remove = useDeleteEvent();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const query = useEvent(id ?? "");

  if (query.isLoading) {
    return <Page title="Event">Ładowanie…</Page>;
  }
  if (query.isError || !query.data) {
    return <Page title="Event">Nie znaleziono.</Page>;
  }

  const row = query.data;
  return (
    <Page
      title={String(row.name)}
      actions={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate({ to: "/events/$id/edit", params: { id: row.id } })}
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
        <dt className="text-slate-500">Name</dt>
        <dd className="text-slate-800">{row.name ?? "—"}</dd>
        <dt className="text-slate-500">Slug</dt>
        <dd className="text-slate-800">{row.slug ?? "—"}</dd>
        <dt className="text-slate-500">Description</dt>
        <dd className="text-slate-800">{row.description ?? "—"}</dd>
        <dt className="text-slate-500">Starts at</dt>
        <dd className="text-slate-800">{formatDateTime(row.startsAt)}</dd>
        <dt className="text-slate-500">Ends at</dt>
        <dd className="text-slate-800">{formatDateTime(row.endsAt)}</dd>
        <dt className="text-slate-500">Status</dt>
        <dd className="text-slate-800">
          <Badge>{row.status}</Badge>
        </dd>
        <dt className="text-slate-500">Public</dt>
        <dd className="text-slate-800">{row.isPublic ? "Tak" : "Nie"}</dd>
        <dt className="text-slate-500">Capacity</dt>
        <dd className="text-slate-800">{row.capacity ?? "—"}</dd>
        <dt className="text-slate-500">Venue</dt>
        <dd className="text-slate-800">{row.venueId ?? "—"}</dd>
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
                    navigate({ to: "/events" });
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

export function EventCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const create = useCreateEvent();
  const relationSource = useRelationSource();

  return (
    <Page title="Nowy: Event">
      <EntityForm
        entity={eventEntity}
        defaultValues={emptyValues(eventEntity)}
        submitLabel="Utwórz"
        relationSource={relationSource}
        onSubmit={async (values) => {
          const created = await create.mutateAsync(values as CreateEventBody);
          toast("Utworzono.", "success");
          navigate({ to: "/events/$id", params: { id: created.id } });
        }}
      />
    </Page>
  );
}

export function EventEdit() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { toast } = useToast();
  const update = useUpdateEvent();
  const relationSource = useRelationSource();
  const query = useEvent(id ?? "");

  if (query.isLoading) {
    return <Page title="Edycja">Ładowanie…</Page>;
  }
  if (query.isError || !query.data) {
    return <Page title="Edycja">Nie znaleziono.</Page>;
  }

  const row = query.data;
  return (
    <Page title={`Edycja: ${String(row.name)}`}>
      <EntityForm
        entity={eventEntity}
        defaultValues={recordToFormValues(eventEntity, row)}
        submitLabel="Zapisz"
        relationSource={relationSource}
        onSubmit={async (values) => {
          await update.mutateAsync({ id: row.id, body: values as UpdateEventBody });
          toast("Zapisano.", "success");
          navigate({ to: "/events/$id", params: { id: row.id } });
        }}
      />
    </Page>
  );
}
