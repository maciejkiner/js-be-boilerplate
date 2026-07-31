import {
  type EntityDescriptor,
  type FieldDescriptor,
  isChoiceField,
  pascal,
} from "./descriptor.js";

// --- api-react (hooki + typy) ----------------------------------------------

export function apiReactHooks(d: EntityDescriptor): string {
  const base = `/api/v1/${d.path}`;
  return `import type { ApiClient, paths } from "@repo/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "./context.js";
import { unwrap } from "./unwrap.js";

export type ${d.Pascal}ListQuery = NonNullable<paths["${base}/"]["get"]["parameters"]["query"]>;
export type ${d.Pascal}List = paths["${base}/"]["get"]["responses"][200]["content"]["application/json"];
export type ${d.Pascal} = paths["${base}/{id}"]["get"]["responses"][200]["content"]["application/json"];
export type Create${d.Pascal}Body = paths["${base}/"]["post"]["requestBody"]["content"]["application/json"];
export type Update${d.Pascal}Body = paths["${base}/{id}"]["patch"]["requestBody"]["content"]["application/json"];

export const ${d.plural}Keys = {
  all: ["${d.plural}"] as const,
  list: (query?: ${d.Pascal}ListQuery) => ["${d.plural}", "list", query ?? {}] as const,
  detail: (id: string) => ["${d.plural}", "detail", id] as const,
};

export function ${d.plural}ListQuery(client: ApiClient, query?: ${d.Pascal}ListQuery) {
  return {
    queryKey: ${d.plural}Keys.list(query),
    queryFn: async (): Promise<${d.Pascal}List> =>
      unwrap(await client.GET("${base}/", { params: { query } })),
  };
}

export function ${d.plural}DetailQuery(client: ApiClient, id: string) {
  return {
    queryKey: ${d.plural}Keys.detail(id),
    queryFn: async (): Promise<${d.Pascal}> =>
      unwrap(await client.GET("${base}/{id}", { params: { path: { id } } })),
  };
}

export function use${d.PascalPlural}(query?: ${d.Pascal}ListQuery) {
  return useQuery(${d.plural}ListQuery(useApiClient(), query));
}

export function use${d.Pascal}(id: string) {
  return useQuery({ ...${d.plural}DetailQuery(useApiClient(), id), enabled: id !== "" });
}

export function useCreate${d.Pascal}() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Create${d.Pascal}Body): Promise<${d.Pascal}> =>
      unwrap(await client.POST("${base}/", { body })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ${d.plural}Keys.all }),
  });
}

export function useUpdate${d.Pascal}() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; body: Update${d.Pascal}Body }): Promise<${d.Pascal}> =>
      unwrap(
        await client.PATCH("${base}/{id}", {
          params: { path: { id: vars.id } },
          body: vars.body,
        }),
      ),
    onSuccess: (_data, vars) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ${d.plural}Keys.all }),
        queryClient.invalidateQueries({ queryKey: ${d.plural}Keys.detail(vars.id) }),
      ]),
  });
}

export function useDelete${d.Pascal}() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      unwrap(await client.DELETE("${base}/{id}", { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ${d.plural}Keys.all }),
  });
}
`;
}

// --- admin (List / Detail / Create / Edit) ----------------------------------

function cellRender(f: FieldDescriptor): string {
  switch (f.control) {
    case "select":
    case "radio":
      return `render: (row) => <Badge>{row.${f.name}}</Badge>`;
    case "date":
      return `render: (row) => formatDate(row.${f.name})`;
    case "datetime":
      return `render: (row) => formatDateTime(row.${f.name})`;
    case "checkbox":
    case "switch":
      return `render: (row) => (row.${f.name} ? "Tak" : "Nie")`;
    case "relation":
      return `render: (row) => row.${f.name} ?? "—"`;
    default:
      return "";
  }
}

function detailValue(f: FieldDescriptor): string {
  switch (f.control) {
    case "select":
    case "radio":
      return `<Badge>{row.${f.name}}</Badge>`;
    case "date":
      return `{formatDate(row.${f.name})}`;
    case "datetime":
      return `{formatDateTime(row.${f.name})}`;
    case "checkbox":
    case "switch":
      return `{row.${f.name} ? "Tak" : "Nie"}`;
    default:
      return `{row.${f.name} ?? "—"}`;
  }
}

export function adminEntity(d: EntityDescriptor): string {
  const filterSelects = d.fields.filter((f) => f.filterable && isChoiceField(f));
  // Importy DS i `ui` budujemy WARUNKOWO — nieużywany import to błąd typecheck/lint/build
  // (`noUnusedLocals`). Każdy z tych symboli pojawia się w kodzie tylko dla części encji:
  // `formatDate` przy polach `date`, `Badge` przy listach zamkniętych, `Select` przy ich filtrach.
  const uiImports = [
    ...(d.fields.some((f) => f.control === "date") ? ["formatDate"] : []),
    ...(d.fields.some((f) => f.control === "datetime") ? ["formatDateTime"] : []),
    "Page",
  ].join(", ");
  const uiImport = `import { ${uiImports} } from "../ui";`;
  const hasChoice = d.fields.some(isChoiceField);
  const dsImports = [
    ...(hasChoice ? ["Badge"] : []),
    "Button",
    "Modal",
    ...(filterSelects.length > 0 ? ["Select"] : []),
    "useToast",
  ].join(", ");
  const columns = d.fields
    .filter((f) => f.visible)
    .map((f) => {
      const parts = [`key: "${f.name}"`, `header: "${f.label}"`];
      if (f.sortable) parts.push("sortable: true");
      const render = cellRender(f);
      if (render) parts.push(render);
      return `    { ${parts.join(", ")} },`;
    })
    .join("\n");

  const filterState = filterSelects
    .map((f) => `  const [${f.name}, set${pascal(f.name)}] = useState("");`)
    .join("\n");
  const queryFilters = filterSelects
    .map((f) => `    ${f.name}: (${f.name} || undefined) as ${d.Pascal}ListQuery["${f.name}"],`)
    .join("\n");
  const toolbar = filterSelects
    .map(
      (f) => `        <Select
          aria-label="Filtr: ${f.label}"
          placeholder="Wszystkie: ${f.label}"
          options={[${(f.options ?? []).map((o) => `{ value: "${o.value}", label: "${o.label}" }`).join(", ")}]}
          value={${f.name}}
          onChange={(event) => {
            set${pascal(f.name)}(event.target.value);
            setPage(1);
          }}
        />`,
    )
    .join("\n");

  const detailRows = d.fields
    .map(
      (f) => `        <dt className="text-slate-500">${f.label}</dt>
        <dd className="text-slate-800">${detailValue(f)}</dd>`,
    )
    .join("\n");

  return `import {
  type ${d.Pascal}List,
  type ${d.Pascal}ListQuery,
  type Create${d.Pascal}Body,
  type Update${d.Pascal}Body,
  useCreate${d.Pascal},
  useDelete${d.Pascal},
  useUpdate${d.Pascal},
  use${d.Pascal},
  use${d.PascalPlural},
} from "@repo/api-react";
import { ${dsImports} } from "@repo/design-system";
import { emptyValues } from "@repo/forms-ui";
import { ${d.name}Entity } from "@repo/schemas";
import { type Column, DataTable, type SortState } from "@repo/ui";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useRelationSource } from "../relation-source";
${uiImport}
import { EntityForm, recordToFormValues } from "./entity-form";

type ${d.Pascal}Row = ${d.Pascal}List["items"][number];

export function ${d.PascalPlural}List() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
${filterState ? `${filterState}\n` : ""}  const [sort, setSort] = useState<SortState>({ column: "createdAt", order: "desc" });

  const query = use${d.PascalPlural}({
    page,
${queryFilters ? `${queryFilters}\n` : ""}    sort: sort.column as ${d.Pascal}ListQuery["sort"],
    order: sort.order,
  });

  const columns: Column<${d.Pascal}Row>[] = [
${columns}
  ];

  return (
    <Page
      title="${d.labelPlural}"
      actions={
        <Button variant="secondary" onClick={() => navigate({ to: "/${d.path}/new" })}>
          Nowy: ${d.label}
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
        onRowClick={(row) => navigate({ to: "/${d.path}/$id", params: { id: row.id } })}
${
  toolbar
    ? `        toolbar={
      <>
${toolbar}
      </>
    }
`
    : ""
}      />
    </Page>
  );
}

export function ${d.Pascal}Detail() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { toast } = useToast();
  const remove = useDelete${d.Pascal}();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const query = use${d.Pascal}(id ?? "");

  if (query.isLoading) {
    return <Page title="${d.label}">Ładowanie…</Page>;
  }
  if (query.isError || !query.data) {
    return <Page title="${d.label}">Nie znaleziono.</Page>;
  }

  const row = query.data;
  return (
    <Page
      title={String(row.${d.displayField})}
      actions={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate({ to: "/${d.path}/$id/edit", params: { id: row.id } })}
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
${detailRows}
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
                    navigate({ to: "/${d.path}" });
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

export function ${d.Pascal}Create() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const create = useCreate${d.Pascal}();
  const relationSource = useRelationSource();

  return (
    <Page title="Nowy: ${d.label}">
      <EntityForm
        entity={${d.name}Entity}
        defaultValues={emptyValues(${d.name}Entity)}
        submitLabel="Utwórz"
        relationSource={relationSource}
        // Bez try/catch: błąd z API obsługuje silnik formularza — pola wskazane w problem+json
        // (np. 409 o unikalności) podświetla przy kontrolkach, resztę pokazuje nad przyciskiem.
        onSubmit={async (values) => {
          const created = await create.mutateAsync(values as Create${d.Pascal}Body);
          toast("Utworzono.", "success");
          navigate({ to: "/${d.path}/$id", params: { id: created.id } });
        }}
      />
    </Page>
  );
}

export function ${d.Pascal}Edit() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { toast } = useToast();
  const update = useUpdate${d.Pascal}();
  const relationSource = useRelationSource();
  const query = use${d.Pascal}(id ?? "");

  if (query.isLoading) {
    return <Page title="Edycja">Ładowanie…</Page>;
  }
  if (query.isError || !query.data) {
    return <Page title="Edycja">Nie znaleziono.</Page>;
  }

  const row = query.data;
  return (
    <Page title={\`Edycja: \${String(row.${d.displayField})}\`}>
      <EntityForm
        entity={${d.name}Entity}
        defaultValues={recordToFormValues(${d.name}Entity, row)}
        submitLabel="Zapisz"
        relationSource={relationSource}
        onSubmit={async (values) => {
          await update.mutateAsync({ id: row.id, body: values as Update${d.Pascal}Body });
          toast("Zapisano.", "success");
          navigate({ to: "/${d.path}/$id", params: { id: row.id } });
        }}
      />
    </Page>
  );
}
`;
}
