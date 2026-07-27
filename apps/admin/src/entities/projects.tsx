import {
  type CreateProjectBody,
  type ProjectList,
  type ProjectListQuery,
  type UpdateProjectBody,
  useCreateProject,
  useDeleteProject,
  useProject,
  useProjects,
  useUpdateProject,
} from "@repo/api-react";
import { Badge, Button, Modal, Select, useToast } from "@repo/design-system";
import { emptyValues } from "@repo/forms-ui";
import { projectEntity } from "@repo/schemas";
import { type Column, DataTable, type SortState } from "@repo/ui";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { formatDate, Page } from "../ui";
import { EntityForm, recordToFormValues } from "./entity-form";

type ProjectRow = ProjectList["items"][number];

const STATUS_OPTIONS = [
  { value: "active", label: "Aktywny" },
  { value: "archived", label: "Zarchiwizowany" },
];

function statusTone(status: string) {
  return status === "active" ? "success" : "neutral";
}

export function ProjectsList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"" | "active" | "archived">("");
  const [sort, setSort] = useState<SortState>({ column: "createdAt", order: "desc" });

  const query = useProjects({
    page,
    status: status || undefined,
    sort: sort.column as ProjectListQuery["sort"],
    order: sort.order,
  });

  const columns: Column<ProjectRow>[] = [
    { key: "name", header: "Nazwa", sortable: true },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge>,
    },
    {
      key: "startDate",
      header: "Start",
      sortable: true,
      render: (row) => formatDate(row.startDate),
    },
    { key: "endDate", header: "Koniec", sortable: true, render: (row) => formatDate(row.endDate) },
  ];

  return (
    <Page
      title="Projekty"
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate({ to: "/projects/new" })}>
            Nowy projekt
          </Button>
          <Button onClick={() => navigate({ to: "/projects/wizard" })}>Wizard</Button>
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
        onRowClick={(row) => navigate({ to: "/projects/$id", params: { id: row.id } })}
        toolbar={
          <Select
            aria-label="Filtr statusu"
            placeholder="Wszystkie statusy"
            options={STATUS_OPTIONS}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as typeof status);
              setPage(1);
            }}
          />
        }
      />
    </Page>
  );
}

export function ProjectDetail() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { toast } = useToast();
  const remove = useDeleteProject();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const query = useProject(id ?? "");

  if (query.isLoading) {
    return <Page title="Projekt">Ładowanie…</Page>;
  }
  if (query.isError || !query.data) {
    return <Page title="Projekt">Nie znaleziono projektu.</Page>;
  }

  const project = query.data;

  function onConfirmDelete() {
    remove.mutate(project.id, {
      onSuccess: () => {
        toast("Projekt usunięty.", "success");
        navigate({ to: "/projects" });
      },
      onError: () => toast("Nie udało się usunąć projektu.", "error"),
    });
  }

  return (
    <Page
      title={project.name}
      actions={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate({ to: "/projects/$id/edit", params: { id: project.id } })}
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
          <Badge tone={statusTone(project.status)}>{project.status}</Badge>
        </dd>
        <dt className="text-slate-500">Opis</dt>
        <dd className="text-slate-800">{project.description ?? "—"}</dd>
        <dt className="text-slate-500">Start</dt>
        <dd className="text-slate-800">{formatDate(project.startDate)}</dd>
        <dt className="text-slate-500">Koniec</dt>
        <dd className="text-slate-800">{formatDate(project.endDate)}</dd>
      </dl>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Usunąć projekt?"
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
        Ta operacja jest miękka (soft delete), ale projekt zniknie z listy.
      </Modal>
    </Page>
  );
}

export function ProjectCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const create = useCreateProject();

  return (
    <Page title="Nowy projekt">
      <EntityForm
        entity={projectEntity}
        defaultValues={emptyValues(projectEntity)}
        submitLabel="Utwórz"
        onSubmit={async (values) => {
          try {
            const created = await create.mutateAsync(values as CreateProjectBody);
            toast("Projekt utworzony.", "success");
            navigate({ to: "/projects/$id", params: { id: created.id } });
          } catch {
            toast("Nie udało się utworzyć projektu.", "error");
          }
        }}
      />
    </Page>
  );
}

export function ProjectEdit() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { toast } = useToast();
  const update = useUpdateProject();
  const query = useProject(id ?? "");

  if (query.isLoading) {
    return <Page title="Edycja projektu">Ładowanie…</Page>;
  }
  if (query.isError || !query.data) {
    return <Page title="Edycja projektu">Nie znaleziono projektu.</Page>;
  }

  const project = query.data;
  return (
    <Page title={`Edycja: ${project.name}`}>
      <EntityForm
        entity={projectEntity}
        defaultValues={recordToFormValues(projectEntity, project)}
        submitLabel="Zapisz"
        onSubmit={async (values) => {
          try {
            await update.mutateAsync({ id: project.id, body: values as UpdateProjectBody });
            toast("Zapisano.", "success");
            navigate({ to: "/projects/$id", params: { id: project.id } });
          } catch {
            toast("Nie udało się zapisać.", "error");
          }
        }}
      />
    </Page>
  );
}
