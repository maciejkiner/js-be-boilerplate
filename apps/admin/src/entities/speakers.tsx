import {
  type SpeakerList,
  type SpeakerListQuery,
  type CreateSpeakerBody,
  type UpdateSpeakerBody,
  useCreateSpeaker,
  useDeleteSpeaker,
  useUpdateSpeaker,
  useSpeaker,
  useSpeakers,
} from "@repo/api-react";
import { Button, Modal, useToast } from "@repo/design-system";
import { emptyValues } from "@repo/forms-ui";
import { speakerEntity } from "@repo/schemas";
import { type Column, DataTable, type SortState } from "@repo/ui";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useRelationSource } from "../relation-source";
import { Page } from "../ui";
import { EntityForm, recordToFormValues } from "./entity-form";

type SpeakerRow = SpeakerList["items"][number];

export function SpeakersList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ column: "createdAt", order: "desc" });

  const query = useSpeakers({
    page,
    sort: sort.column as SpeakerListQuery["sort"],
    order: sort.order,
  });

  const columns: Column<SpeakerRow>[] = [
    { key: "fullName", header: "Full name", sortable: true },
    { key: "email", header: "Email" },
    { key: "company", header: "Company" },
    { key: "website", header: "Website" },
    {
      key: "isConfirmed",
      header: "Is confirmed",
      render: (row) => (row.isConfirmed ? "Tak" : "Nie"),
    },
  ];

  return (
    <Page
      title="Speakers"
      actions={
        <Button variant="secondary" onClick={() => navigate({ to: "/speakers/new" })}>
          Nowy: Speaker
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
        onRowClick={(row) => navigate({ to: "/speakers/$id", params: { id: row.id } })}
      />
    </Page>
  );
}

export function SpeakerDetail() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { toast } = useToast();
  const remove = useDeleteSpeaker();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const query = useSpeaker(id ?? "");

  if (query.isLoading) {
    return <Page title="Speaker">Ładowanie…</Page>;
  }
  if (query.isError || !query.data) {
    return <Page title="Speaker">Nie znaleziono.</Page>;
  }

  const row = query.data;
  return (
    <Page
      title={String(row.fullName)}
      actions={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate({ to: "/speakers/$id/edit", params: { id: row.id } })}
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
        <dt className="text-slate-500">Full name</dt>
        <dd className="text-slate-800">{row.fullName ?? "—"}</dd>
        <dt className="text-slate-500">Email</dt>
        <dd className="text-slate-800">{row.email ?? "—"}</dd>
        <dt className="text-slate-500">Bio</dt>
        <dd className="text-slate-800">{row.bio ?? "—"}</dd>
        <dt className="text-slate-500">Company</dt>
        <dd className="text-slate-800">{row.company ?? "—"}</dd>
        <dt className="text-slate-500">Website</dt>
        <dd className="text-slate-800">{row.website ?? "—"}</dd>
        <dt className="text-slate-500">Is confirmed</dt>
        <dd className="text-slate-800">{row.isConfirmed ? "Tak" : "Nie"}</dd>
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
                    navigate({ to: "/speakers" });
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

export function SpeakerCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const create = useCreateSpeaker();
  const relationSource = useRelationSource();

  return (
    <Page title="Nowy: Speaker">
      <EntityForm
        entity={speakerEntity}
        defaultValues={emptyValues(speakerEntity)}
        submitLabel="Utwórz"
        relationSource={relationSource}
        onSubmit={async (values) => {
          const created = await create.mutateAsync(values as CreateSpeakerBody);
          toast("Utworzono.", "success");
          navigate({ to: "/speakers/$id", params: { id: created.id } });
        }}
      />
    </Page>
  );
}

export function SpeakerEdit() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { toast } = useToast();
  const update = useUpdateSpeaker();
  const relationSource = useRelationSource();
  const query = useSpeaker(id ?? "");

  if (query.isLoading) {
    return <Page title="Edycja">Ładowanie…</Page>;
  }
  if (query.isError || !query.data) {
    return <Page title="Edycja">Nie znaleziono.</Page>;
  }

  const row = query.data;
  return (
    <Page title={`Edycja: ${String(row.fullName)}`}>
      <EntityForm
        entity={speakerEntity}
        defaultValues={recordToFormValues(speakerEntity, row)}
        submitLabel="Zapisz"
        relationSource={relationSource}
        onSubmit={async (values) => {
          await update.mutateAsync({ id: row.id, body: values as UpdateSpeakerBody });
          toast("Zapisano.", "success");
          navigate({ to: "/speakers/$id", params: { id: row.id } });
        }}
      />
    </Page>
  );
}
