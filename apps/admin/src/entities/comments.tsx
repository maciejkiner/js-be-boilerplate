import {
  type CommentList,
  type CommentListQuery,
  type CreateCommentBody,
  type UpdateCommentBody,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
  useComment,
  useComments,
} from "@repo/api-react";
import { errorMessage } from "@repo/api-client";
import { Badge, Button, Modal, Select, useToast } from "@repo/design-system";
import { emptyValues } from "@repo/forms-ui";
import { commentEntity } from "@repo/schemas";
import { type Column, DataTable, type SortState } from "@repo/ui";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useRelationSource } from "../relation-source";
import { Page } from "../ui";
import { EntityForm, recordToFormValues } from "./entity-form";

type CommentRow = CommentList["items"][number];

export function CommentsList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<SortState>({ column: "createdAt", order: "desc" });

  const query = useComments({
    page,
    status: (status || undefined) as CommentListQuery["status"],
    sort: sort.column as CommentListQuery["sort"],
    order: sort.order,
  });

  const columns: Column<CommentRow>[] = [
    { key: "status", header: "Status", render: (row) => <Badge>{row.status}</Badge> },
    { key: "taskId", header: "Task", render: (row) => row.taskId ?? "—" },
    { key: "authorId", header: "Author", render: (row) => row.authorId ?? "—" },
  ];

  return (
    <Page
      title="Comments"
      actions={
        <Button variant="secondary" onClick={() => navigate({ to: "/comments/new" })}>
          Nowy: Comment
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
        onRowClick={(row) => navigate({ to: "/comments/$id", params: { id: row.id } })}
        toolbar={
          <>
            <Select
              aria-label="Filtr: Status"
              placeholder="Wszystkie: Status"
              options={[
                { value: "active", label: "Active" },
                { value: "deleted", label: "Deleted" },
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

export function CommentDetail() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { toast } = useToast();
  const remove = useDeleteComment();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const query = useComment(id ?? "");

  if (query.isLoading) {
    return <Page title="Comment">Ładowanie…</Page>;
  }
  if (query.isError || !query.data) {
    return <Page title="Comment">Nie znaleziono.</Page>;
  }

  const row = query.data;
  return (
    <Page
      title={String(row.body)}
      actions={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate({ to: "/comments/$id/edit", params: { id: row.id } })}
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
        <dt className="text-slate-500">Body</dt>
        <dd className="text-slate-800">{row.body ?? "—"}</dd>
        <dt className="text-slate-500">Status</dt>
        <dd className="text-slate-800">
          <Badge>{row.status}</Badge>
        </dd>
        <dt className="text-slate-500">Task</dt>
        <dd className="text-slate-800">{row.taskId ?? "—"}</dd>
        <dt className="text-slate-500">Author</dt>
        <dd className="text-slate-800">{row.authorId ?? "—"}</dd>
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
                    navigate({ to: "/comments" });
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

export function CommentCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const create = useCreateComment();
  const relationSource = useRelationSource();

  return (
    <Page title="Nowy: Comment">
      <EntityForm
        entity={commentEntity}
        defaultValues={emptyValues(commentEntity)}
        submitLabel="Utwórz"
        relationSource={relationSource}
        onSubmit={async (values) => {
          const created = await create.mutateAsync(values as CreateCommentBody);
          toast("Utworzono.", "success");
          navigate({ to: "/comments/$id", params: { id: created.id } });
        }}
      />
    </Page>
  );
}

export function CommentEdit() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { toast } = useToast();
  const update = useUpdateComment();
  const relationSource = useRelationSource();
  const query = useComment(id ?? "");

  if (query.isLoading) {
    return <Page title="Edycja">Ładowanie…</Page>;
  }
  if (query.isError || !query.data) {
    return <Page title="Edycja">Nie znaleziono.</Page>;
  }

  const row = query.data;
  return (
    <Page title={`Edycja: ${String(row.body)}`}>
      <EntityForm
        entity={commentEntity}
        defaultValues={recordToFormValues(commentEntity, row)}
        submitLabel="Zapisz"
        relationSource={relationSource}
        onSubmit={async (values) => {
          await update.mutateAsync({ id: row.id, body: values as UpdateCommentBody });
          toast("Zapisano.", "success");
          navigate({ to: "/comments/$id", params: { id: row.id } });
        }}
      />
    </Page>
  );
}
