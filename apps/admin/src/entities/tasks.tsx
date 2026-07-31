import {
  type CreateTaskBody,
  type TaskList,
  type TaskListQuery,
  type UpdateTaskBody,
  useCreateTask,
  useDeleteTask,
  useTask,
  useTasks,
  useUpdateTask,
} from "@repo/api-react";
import { Badge, Button, Modal, Select, useToast } from "@repo/design-system";
import { emptyValues } from "@repo/forms-ui";
import { taskEntity } from "@repo/schemas";
import { type Column, DataTable, type SortState } from "@repo/ui";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useRelationSource } from "../relation-source";
import { formatDate, Page } from "../ui";
import { EntityForm, recordToFormValues } from "./entity-form";

type TaskRow = TaskList["items"][number];

const STATUS_OPTIONS = [
  { value: "todo", label: "Do zrobienia" },
  { value: "in_progress", label: "W toku" },
  { value: "done", label: "Zrobione" },
];
const PRIORITY_OPTIONS = [
  { value: "low", label: "Niski" },
  { value: "medium", label: "Średni" },
  { value: "high", label: "Wysoki" },
];

function priorityTone(priority: string) {
  return priority === "high" ? "danger" : priority === "medium" ? "warning" : "neutral";
}

export function TasksList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [sort, setSort] = useState<SortState>({ column: "createdAt", order: "desc" });

  const query = useTasks({
    page,
    status: (status || undefined) as TaskListQuery["status"],
    priority: (priority || undefined) as TaskListQuery["priority"],
    sort: sort.column as TaskListQuery["sort"],
    order: sort.order,
  });

  const columns: Column<TaskRow>[] = [
    { key: "title", header: "Tytuł", sortable: true },
    { key: "status", header: "Status", render: (row) => <Badge>{row.status}</Badge> },
    {
      key: "priority",
      header: "Priorytet",
      render: (row) => <Badge tone={priorityTone(row.priority)}>{row.priority}</Badge>,
    },
    { key: "dueDate", header: "Termin", sortable: true, render: (row) => formatDate(row.dueDate) },
  ];

  return (
    <Page
      title="Zadania"
      actions={
        <Button variant="secondary" onClick={() => navigate({ to: "/tasks/new" })}>
          Nowe zadanie
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
        onRowClick={(row) => navigate({ to: "/tasks/$id", params: { id: row.id } })}
        toolbar={
          <>
            <Select
              aria-label="Filtr statusu"
              placeholder="Wszystkie statusy"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            />
            <Select
              aria-label="Filtr priorytetu"
              placeholder="Wszystkie priorytety"
              options={PRIORITY_OPTIONS}
              value={priority}
              onChange={(event) => {
                setPriority(event.target.value);
                setPage(1);
              }}
            />
          </>
        }
      />
    </Page>
  );
}

export function TaskDetail() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { toast } = useToast();
  const remove = useDeleteTask();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const query = useTask(id ?? "");

  if (query.isLoading) {
    return <Page title="Zadanie">Ładowanie…</Page>;
  }
  if (query.isError || !query.data) {
    return <Page title="Zadanie">Nie znaleziono zadania.</Page>;
  }

  const task = query.data;

  function onConfirmDelete() {
    remove.mutate(task.id, {
      onSuccess: () => {
        toast("Zadanie usunięte.", "success");
        navigate({ to: "/tasks" });
      },
      onError: () => toast("Nie udało się usunąć zadania.", "error"),
    });
  }

  return (
    <Page
      title={task.title}
      actions={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate({ to: "/tasks/$id/edit", params: { id: task.id } })}
          >
            Edytuj
          </Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Usuń
          </Button>
        </div>
      }
    >
      <dl className="grid max-w-lg grid-cols-[8rem_1fr] gap-y-2 text-sm">
        <dt className="text-slate-500">Status</dt>
        <dd>
          <Badge>{task.status}</Badge>
        </dd>
        <dt className="text-slate-500">Priorytet</dt>
        <dd>
          <Badge tone={priorityTone(task.priority)}>{task.priority}</Badge>
        </dd>
        <dt className="text-slate-500">Termin</dt>
        <dd className="text-slate-800">{formatDate(task.dueDate)}</dd>
        <dt className="text-slate-500">Zablokowane</dt>
        <dd className="text-slate-800">{task.isBlocked ? "Tak" : "Nie"}</dd>
        <dt className="text-slate-500">Opis</dt>
        <dd className="text-slate-800">{task.description ?? "—"}</dd>
      </dl>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Usunąć zadanie?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Anuluj
            </Button>
            <Button variant="danger" disabled={remove.isPending} onClick={onConfirmDelete}>
              Usuń
            </Button>
          </>
        }
      >
        Ta operacja jest miękka (soft delete), ale zadanie zniknie z listy.
      </Modal>
    </Page>
  );
}

export function TaskCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const create = useCreateTask();
  const relationSource = useRelationSource();

  return (
    <Page title="Nowe zadanie">
      <EntityForm
        entity={taskEntity}
        defaultValues={emptyValues(taskEntity)}
        submitLabel="Utwórz"
        relationSource={relationSource}
        onSubmit={async (values) => {
          const created = await create.mutateAsync(values as CreateTaskBody);
          toast("Zadanie utworzone.", "success");
          navigate({ to: "/tasks/$id", params: { id: created.id } });
        }}
      />
    </Page>
  );
}

export function TaskEdit() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { toast } = useToast();
  const update = useUpdateTask();
  const relationSource = useRelationSource();
  const query = useTask(id ?? "");

  if (query.isLoading) {
    return <Page title="Edycja zadania">Ładowanie…</Page>;
  }
  if (query.isError || !query.data) {
    return <Page title="Edycja zadania">Nie znaleziono zadania.</Page>;
  }

  const task = query.data;
  return (
    <Page title={`Edycja: ${task.title}`}>
      <EntityForm
        entity={taskEntity}
        defaultValues={recordToFormValues(taskEntity, task)}
        submitLabel="Zapisz"
        relationSource={relationSource}
        onSubmit={async (values) => {
          await update.mutateAsync({ id: task.id, body: values as UpdateTaskBody });
          toast("Zapisano.", "success");
          navigate({ to: "/tasks/$id", params: { id: task.id } });
        }}
      />
    </Page>
  );
}
