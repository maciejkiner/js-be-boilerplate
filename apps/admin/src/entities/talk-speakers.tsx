import {
  type TalkSpeakerList,
  type TalkSpeakerListQuery,
  type CreateTalkSpeakerBody,
  type UpdateTalkSpeakerBody,
  useCreateTalkSpeaker,
  useDeleteTalkSpeaker,
  useUpdateTalkSpeaker,
  useTalkSpeaker,
  useTalkSpeakers,
} from "@repo/api-react";
import { errorMessage } from "@repo/api-client";
import { Badge, Button, Modal, useToast } from "@repo/design-system";
import { emptyValues } from "@repo/forms-ui";
import { talkSpeakerEntity } from "@repo/schemas";
import { type Column, DataTable, type SortState } from "@repo/ui";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useRelationSource } from "../relation-source";
import { Page } from "../ui";
import { EntityForm, recordToFormValues } from "./entity-form";

type TalkSpeakerRow = TalkSpeakerList["items"][number];

export function TalkSpeakersList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ column: "createdAt", order: "desc" });

  const query = useTalkSpeakers({
    page,
    sort: sort.column as TalkSpeakerListQuery["sort"],
    order: sort.order,
  });

  const columns: Column<TalkSpeakerRow>[] = [
    { key: "talkId", header: "Talk", render: (row) => row.talkId ?? "—" },
    { key: "speakerId", header: "Speaker", render: (row) => row.speakerId ?? "—" },
    { key: "role", header: "Role", render: (row) => <Badge>{row.role}</Badge> },
    { key: "orderIndex", header: "Order index", sortable: true },
  ];

  return (
    <Page
      title="Talk speakers"
      actions={
        <Button variant="secondary" onClick={() => navigate({ to: "/talk-speakers/new" })}>
          Nowy: Talk speaker
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
        onRowClick={(row) => navigate({ to: "/talk-speakers/$id", params: { id: row.id } })}
      />
    </Page>
  );
}

export function TalkSpeakerDetail() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { toast } = useToast();
  const remove = useDeleteTalkSpeaker();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const query = useTalkSpeaker(id ?? "");

  if (query.isLoading) {
    return <Page title="Talk speaker">Ładowanie…</Page>;
  }
  if (query.isError || !query.data) {
    return <Page title="Talk speaker">Nie znaleziono.</Page>;
  }

  const row = query.data;
  return (
    <Page
      title={String(row.role)}
      actions={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate({ to: "/talk-speakers/$id/edit", params: { id: row.id } })}
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
        <dt className="text-slate-500">Talk</dt>
        <dd className="text-slate-800">{row.talkId ?? "—"}</dd>
        <dt className="text-slate-500">Speaker</dt>
        <dd className="text-slate-800">{row.speakerId ?? "—"}</dd>
        <dt className="text-slate-500">Role</dt>
        <dd className="text-slate-800">
          <Badge>{row.role}</Badge>
        </dd>
        <dt className="text-slate-500">Order index</dt>
        <dd className="text-slate-800">{row.orderIndex ?? "—"}</dd>
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
                    navigate({ to: "/talk-speakers" });
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

export function TalkSpeakerCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const create = useCreateTalkSpeaker();
  const relationSource = useRelationSource();

  return (
    <Page title="Nowy: Talk speaker">
      <EntityForm
        entity={talkSpeakerEntity}
        defaultValues={emptyValues(talkSpeakerEntity)}
        submitLabel="Utwórz"
        relationSource={relationSource}
        onSubmit={async (values) => {
          const created = await create.mutateAsync(values as CreateTalkSpeakerBody);
          toast("Utworzono.", "success");
          navigate({ to: "/talk-speakers/$id", params: { id: created.id } });
        }}
      />
    </Page>
  );
}

export function TalkSpeakerEdit() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { toast } = useToast();
  const update = useUpdateTalkSpeaker();
  const relationSource = useRelationSource();
  const query = useTalkSpeaker(id ?? "");

  if (query.isLoading) {
    return <Page title="Edycja">Ładowanie…</Page>;
  }
  if (query.isError || !query.data) {
    return <Page title="Edycja">Nie znaleziono.</Page>;
  }

  const row = query.data;
  return (
    <Page title={`Edycja: ${String(row.role)}`}>
      <EntityForm
        entity={talkSpeakerEntity}
        defaultValues={recordToFormValues(talkSpeakerEntity, row)}
        submitLabel="Zapisz"
        relationSource={relationSource}
        onSubmit={async (values) => {
          await update.mutateAsync({ id: row.id, body: values as UpdateTalkSpeakerBody });
          toast("Zapisano.", "success");
          navigate({ to: "/talk-speakers/$id", params: { id: row.id } });
        }}
      />
    </Page>
  );
}
