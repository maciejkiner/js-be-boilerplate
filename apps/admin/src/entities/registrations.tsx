import {
  type RegistrationList,
  type RegistrationListQuery,
  type CreateRegistrationBody,
  type UpdateRegistrationBody,
  useCreateRegistration,
  useDeleteRegistration,
  useUpdateRegistration,
  useRegistration,
  useRegistrations,
} from "@repo/api-react";
import { Badge, Button, Modal, Select, useToast } from "@repo/design-system";
import { emptyValues } from "@repo/forms-ui";
import { registrationEntity } from "@repo/schemas";
import { type Column, DataTable, type SortState } from "@repo/ui";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useRelationSource } from "../relation-source";
import { Page } from "../ui";
import { EntityForm, recordToFormValues } from "./entity-form";

type RegistrationRow = RegistrationList["items"][number];

export function RegistrationsList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [ticketType, setTicketType] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<SortState>({ column: "createdAt", order: "desc" });

  const query = useRegistrations({
    page,
    ticketType: (ticketType || undefined) as RegistrationListQuery["ticketType"],
    status: (status || undefined) as RegistrationListQuery["status"],
    sort: sort.column as RegistrationListQuery["sort"],
    order: sort.order,
  });

  const columns: Column<RegistrationRow>[] = [
    { key: "eventId", header: "Event", render: (row) => row.eventId ?? "—" },
    { key: "fullName", header: "Full name", sortable: true },
    { key: "email", header: "Email" },
    { key: "ticketType", header: "Ticket type", render: (row) => <Badge>{row.ticketType}</Badge> },
    {
      key: "needsCatering",
      header: "Needs catering",
      render: (row) => (row.needsCatering ? "Tak" : "Nie"),
    },
    { key: "status", header: "Status", render: (row) => <Badge>{row.status}</Badge> },
  ];

  return (
    <Page
      title="Registrations"
      actions={
        <Button variant="secondary" onClick={() => navigate({ to: "/registrations/new" })}>
          Nowy: Registration
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
        onRowClick={(row) => navigate({ to: "/registrations/$id", params: { id: row.id } })}
        toolbar={
          <>
            <Select
              aria-label="Filtr: Ticket type"
              placeholder="Wszystkie: Ticket type"
              options={[
                { value: "standard", label: "Standard" },
                { value: "student", label: "Student" },
                { value: "speaker", label: "Speaker" },
              ]}
              value={ticketType}
              onChange={(event) => {
                setTicketType(event.target.value);
                setPage(1);
              }}
            />
            <Select
              aria-label="Filtr: Status"
              placeholder="Wszystkie: Status"
              options={[
                { value: "pending", label: "Pending" },
                { value: "confirmed", label: "Confirmed" },
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

export function RegistrationDetail() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { toast } = useToast();
  const remove = useDeleteRegistration();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const query = useRegistration(id ?? "");

  if (query.isLoading) {
    return <Page title="Registration">Ładowanie…</Page>;
  }
  if (query.isError || !query.data) {
    return <Page title="Registration">Nie znaleziono.</Page>;
  }

  const row = query.data;
  return (
    <Page
      title={String(row.email)}
      actions={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate({ to: "/registrations/$id/edit", params: { id: row.id } })}
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
        <dt className="text-slate-500">Event</dt>
        <dd className="text-slate-800">{row.eventId ?? "—"}</dd>
        <dt className="text-slate-500">Full name</dt>
        <dd className="text-slate-800">{row.fullName ?? "—"}</dd>
        <dt className="text-slate-500">Email</dt>
        <dd className="text-slate-800">{row.email ?? "—"}</dd>
        <dt className="text-slate-500">Ticket type</dt>
        <dd className="text-slate-800">
          <Badge>{row.ticketType}</Badge>
        </dd>
        <dt className="text-slate-500">Needs catering</dt>
        <dd className="text-slate-800">{row.needsCatering ? "Tak" : "Nie"}</dd>
        <dt className="text-slate-500">Accepts terms</dt>
        <dd className="text-slate-800">{row.acceptsTerms ? "Tak" : "Nie"}</dd>
        <dt className="text-slate-500">Status</dt>
        <dd className="text-slate-800">
          <Badge>{row.status}</Badge>
        </dd>
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
                    navigate({ to: "/registrations" });
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

export function RegistrationCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const create = useCreateRegistration();
  const relationSource = useRelationSource();

  return (
    <Page title="Nowy: Registration">
      <EntityForm
        entity={registrationEntity}
        defaultValues={emptyValues(registrationEntity)}
        submitLabel="Utwórz"
        relationSource={relationSource}
        onSubmit={async (values) => {
          try {
            const created = await create.mutateAsync(values as CreateRegistrationBody);
            toast("Utworzono.", "success");
            navigate({ to: "/registrations/$id", params: { id: created.id } });
          } catch {
            toast("Nie udało się utworzyć.", "error");
          }
        }}
      />
    </Page>
  );
}

export function RegistrationEdit() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { toast } = useToast();
  const update = useUpdateRegistration();
  const relationSource = useRelationSource();
  const query = useRegistration(id ?? "");

  if (query.isLoading) {
    return <Page title="Edycja">Ładowanie…</Page>;
  }
  if (query.isError || !query.data) {
    return <Page title="Edycja">Nie znaleziono.</Page>;
  }

  const row = query.data;
  return (
    <Page title={`Edycja: ${String(row.email)}`}>
      <EntityForm
        entity={registrationEntity}
        defaultValues={recordToFormValues(registrationEntity, row)}
        submitLabel="Zapisz"
        relationSource={relationSource}
        onSubmit={async (values) => {
          try {
            await update.mutateAsync({ id: row.id, body: values as UpdateRegistrationBody });
            toast("Zapisano.", "success");
            navigate({ to: "/registrations/$id", params: { id: row.id } });
          } catch {
            toast("Nie udało się zapisać.", "error");
          }
        }}
      />
    </Page>
  );
}
