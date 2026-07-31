import {
  type RoomList,
  type RoomListQuery,
  type CreateRoomBody,
  type UpdateRoomBody,
  useCreateRoom,
  useDeleteRoom,
  useUpdateRoom,
  useRoom,
  useRooms,
} from "@repo/api-react";
import { Button, Modal, useToast } from "@repo/design-system";
import { emptyValues } from "@repo/forms-ui";
import { roomEntity } from "@repo/schemas";
import { type Column, DataTable, type SortState } from "@repo/ui";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useRelationSource } from "../relation-source";
import { Page } from "../ui";
import { EntityForm, recordToFormValues } from "./entity-form";

type RoomRow = RoomList["items"][number];

export function RoomsList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ column: "createdAt", order: "desc" });

  const query = useRooms({
    page,
    sort: sort.column as RoomListQuery["sort"],
    order: sort.order,
  });

  const columns: Column<RoomRow>[] = [
    { key: "name", header: "Name", sortable: true },
    { key: "capacity", header: "Capacity", sortable: true },
    {
      key: "hasProjector",
      header: "Has projector",
      render: (row) => (row.hasProjector ? "Tak" : "Nie"),
    },
    { key: "venueId", header: "Venue", render: (row) => row.venueId ?? "—" },
  ];

  return (
    <Page
      title="Rooms"
      actions={
        <Button variant="secondary" onClick={() => navigate({ to: "/rooms/new" })}>
          Nowy: Room
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
        onRowClick={(row) => navigate({ to: "/rooms/$id", params: { id: row.id } })}
      />
    </Page>
  );
}

export function RoomDetail() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { toast } = useToast();
  const remove = useDeleteRoom();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const query = useRoom(id ?? "");

  if (query.isLoading) {
    return <Page title="Room">Ładowanie…</Page>;
  }
  if (query.isError || !query.data) {
    return <Page title="Room">Nie znaleziono.</Page>;
  }

  const row = query.data;
  return (
    <Page
      title={String(row.name)}
      actions={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate({ to: "/rooms/$id/edit", params: { id: row.id } })}
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
        <dt className="text-slate-500">Capacity</dt>
        <dd className="text-slate-800">{row.capacity ?? "—"}</dd>
        <dt className="text-slate-500">Has projector</dt>
        <dd className="text-slate-800">{row.hasProjector ? "Tak" : "Nie"}</dd>
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
                    navigate({ to: "/rooms" });
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

export function RoomCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const create = useCreateRoom();
  const relationSource = useRelationSource();

  return (
    <Page title="Nowy: Room">
      <EntityForm
        entity={roomEntity}
        defaultValues={emptyValues(roomEntity)}
        submitLabel="Utwórz"
        relationSource={relationSource}
        onSubmit={async (values) => {
          const created = await create.mutateAsync(values as CreateRoomBody);
          toast("Utworzono.", "success");
          navigate({ to: "/rooms/$id", params: { id: created.id } });
        }}
      />
    </Page>
  );
}

export function RoomEdit() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { toast } = useToast();
  const update = useUpdateRoom();
  const relationSource = useRelationSource();
  const query = useRoom(id ?? "");

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
        entity={roomEntity}
        defaultValues={recordToFormValues(roomEntity, row)}
        submitLabel="Zapisz"
        relationSource={relationSource}
        onSubmit={async (values) => {
          await update.mutateAsync({ id: row.id, body: values as UpdateRoomBody });
          toast("Zapisano.", "success");
          navigate({ to: "/rooms/$id", params: { id: row.id } });
        }}
      />
    </Page>
  );
}
