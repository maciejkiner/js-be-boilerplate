import {
  type VenueList,
  type VenueListQuery,
  type CreateVenueBody,
  type UpdateVenueBody,
  useCreateVenue,
  useDeleteVenue,
  useUpdateVenue,
  useVenue,
  useVenues,
} from "@repo/api-react";
import { errorMessage } from "@repo/api-client";
import { Button, Modal, useToast } from "@repo/design-system";
import { emptyValues } from "@repo/forms-ui";
import { venueEntity } from "@repo/schemas";
import { type Column, DataTable, type SortState } from "@repo/ui";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useRelationSource } from "../relation-source";
import { Page } from "../ui";
import { EntityForm, recordToFormValues } from "./entity-form";

type VenueRow = VenueList["items"][number];

export function VenuesList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ column: "createdAt", order: "desc" });

  const query = useVenues({
    page,
    sort: sort.column as VenueListQuery["sort"],
    order: sort.order,
  });

  const columns: Column<VenueRow>[] = [
    { key: "name", header: "Name", sortable: true },
    { key: "city", header: "City", sortable: true },
    { key: "address", header: "Address" },
  ];

  return (
    <Page
      title="Venues"
      actions={
        <Button variant="secondary" onClick={() => navigate({ to: "/venues/new" })}>
          Nowy: Venue
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
        onRowClick={(row) => navigate({ to: "/venues/$id", params: { id: row.id } })}
      />
    </Page>
  );
}

export function VenueDetail() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { toast } = useToast();
  const remove = useDeleteVenue();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const query = useVenue(id ?? "");

  if (query.isLoading) {
    return <Page title="Venue">Ładowanie…</Page>;
  }
  if (query.isError || !query.data) {
    return <Page title="Venue">Nie znaleziono.</Page>;
  }

  const row = query.data;
  return (
    <Page
      title={String(row.name)}
      actions={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate({ to: "/venues/$id/edit", params: { id: row.id } })}
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
        <dt className="text-slate-500">City</dt>
        <dd className="text-slate-800">{row.city ?? "—"}</dd>
        <dt className="text-slate-500">Address</dt>
        <dd className="text-slate-800">{row.address ?? "—"}</dd>
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
                    navigate({ to: "/venues" });
                  },
                  onError: (error) => toast(errorMessage(error, "Nie udało się usunąć."), "error"),
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

export function VenueCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const create = useCreateVenue();
  const relationSource = useRelationSource();

  return (
    <Page title="Nowy: Venue">
      <EntityForm
        entity={venueEntity}
        defaultValues={emptyValues(venueEntity)}
        submitLabel="Utwórz"
        relationSource={relationSource}
        onSubmit={async (values) => {
          const created = await create.mutateAsync(values as CreateVenueBody);
          toast("Utworzono.", "success");
          navigate({ to: "/venues/$id", params: { id: created.id } });
        }}
      />
    </Page>
  );
}

export function VenueEdit() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { toast } = useToast();
  const update = useUpdateVenue();
  const relationSource = useRelationSource();
  const query = useVenue(id ?? "");

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
        entity={venueEntity}
        defaultValues={recordToFormValues(venueEntity, row)}
        submitLabel="Zapisz"
        relationSource={relationSource}
        onSubmit={async (values) => {
          await update.mutateAsync({ id: row.id, body: values as UpdateVenueBody });
          toast("Zapisano.", "success");
          navigate({ to: "/venues/$id", params: { id: row.id } });
        }}
      />
    </Page>
  );
}
