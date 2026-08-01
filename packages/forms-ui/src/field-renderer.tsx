import {
  Checkbox,
  Combobox,
  DateInput,
  Input,
  RadioGroup,
  Select,
  Switch,
  Textarea,
} from "@repo/design-system";
import type { FieldControl, FieldOption, RelationMeta } from "@repo/schemas";
import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

export interface FieldDef {
  name: string;
  label: string;
  control: FieldControl;
  /** The hint text rendered under the field (from `FieldMeta.help`). */
  help?: string;
  options?: FieldOption[];
  relation?: RelationMeta;
  required?: boolean;
  /** Conditional visibility — the field renders only when this returns `true` for the current values. */
  visibleWhen?: (values: Record<string, unknown>) => boolean;
}

/**
 * The option source for relation fields: a generic async fetcher injected by the shell. It receives
 * the `relation` (the target entity plus `displayField`) and the search phrase, and returns raw
 * entity rows (with an `id`). `RelationControl` computes the label from `relation.displayField`,
 * which lets the same target entity be shown through different fields (`task` by `title` in one
 * place, by `priority` in another).
 */
export type RelationSource = (
  relation: RelationMeta,
  query: string,
) => Promise<Array<{ id: string } & Record<string, unknown>>>;

export interface FieldRendererProps {
  field: FieldDef;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
  onBlur?: () => void;
  relationSource?: RelationSource;
  disabled?: boolean;
}

/**
 * A relation field: options are fetched asynchronously through the injected `relationSource` (one
 * `useQuery` per field, which keeps the rules of hooks). The label comes from
 * `relation.displayField`. `onSearch` refreshes the query
 * (a server-side `?q` where supported), and the result is additionally filtered locally by label
 * (so typing filters even for entities whose endpoint has no `?q`).
 */
function RelationControl({
  relation,
  value,
  onChange,
  relationSource,
  disabled,
}: {
  relation?: RelationMeta;
  value: unknown;
  onChange: (value: unknown) => void;
  relationSource?: RelationSource;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const { data, isFetching } = useQuery({
    queryKey: ["relation-options", relation?.entity, query],
    queryFn: () => relationSource!(relation!, query),
    enabled: Boolean(relation && relationSource),
  });
  const q = query.trim().toLowerCase();
  const options = (data ?? [])
    .map((item) => ({
      value: item.id,
      label: relation ? String(item[relation.displayField] ?? item.id) : item.id,
    }))
    .filter((option) => !q || option.label.toLowerCase().includes(q));
  return (
    <Combobox
      value={(value as string) ?? ""}
      onValueChange={onChange}
      options={options}
      onSearch={setQuery}
      loading={isFetching}
      disabled={disabled}
    />
  );
}

/**
 * The EXPLICIT "field control → DS component" mapping. The only place where we decide how to
 * render a given type. A new field type means a new `case` plus an entry in the recipe/inventory.
 */
function Control({ field, value, onChange, relationSource, disabled }: FieldRendererProps) {
  const id = `field-${field.name}`;
  switch (field.control) {
    case "text":
      return (
        <Input
          id={id}
          type="text"
          value={(value as string) ?? ""}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "textarea":
      return (
        <Textarea
          id={id}
          value={(value as string) ?? ""}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "number":
      return (
        <Input
          id={id}
          type="number"
          value={value == null ? "" : (value as number)}
          disabled={disabled}
          onChange={(event) =>
            onChange(event.target.value === "" ? undefined : Number(event.target.value))
          }
        />
      );
    case "date":
      return (
        <DateInput
          id={id}
          value={(value as string) ?? ""}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    // The DS (read-only) has no separate date-with-time control — we build it from the `Input`
    // primitive, exactly as for `text` and `number`. The value is `YYYY-MM-DDTHH:mm` in the browser's
    // LOCAL time; `z.coerce.date()` at the API boundary reads it as the server's local time.
    case "datetime":
      return (
        <Input
          id={id}
          type="datetime-local"
          value={(value as string) ?? ""}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "select":
      return (
        <Select
          id={id}
          options={field.options ?? []}
          placeholder="—"
          value={(value as string) ?? ""}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "checkbox":
      return (
        <Checkbox
          id={id}
          checked={Boolean(value)}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
      );
    case "switch":
      return <Switch checked={Boolean(value)} disabled={disabled} onCheckedChange={onChange} />;
    case "radio":
      return (
        <RadioGroup
          name={field.name}
          options={field.options ?? []}
          value={(value as string) ?? ""}
          disabled={disabled}
          onValueChange={onChange}
        />
      );
    case "relation":
      return (
        <RelationControl
          relation={field.relation}
          value={value}
          onChange={onChange}
          relationSource={relationSource}
          disabled={disabled}
        />
      );
    default:
      return null;
  }
}

/** A field = label (+ `*` when required) + the DS control + the hint (`help`) + the error message. */
export function Field({
  field,
  error,
  children,
}: {
  field: FieldDef;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`field-${field.name}`} className="text-sm font-medium text-slate-700">
        {field.label}
        {field.required && (
          <span aria-hidden className="text-red-600">
            {" *"}
          </span>
        )}
      </label>
      {children}
      {field.help && (
        <p id={`field-${field.name}-help`} className="text-xs text-slate-500">
          {field.help}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/** Renders a single field: the `Field` wrapper plus the control from the mapping. */
export function FieldRenderer(props: FieldRendererProps) {
  return (
    <Field field={props.field} error={props.error}>
      <Control {...props} />
    </Field>
  );
}
