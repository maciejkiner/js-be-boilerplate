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
  /** Tekst-podpowiedź renderowany pod polem (z `FieldMeta.help`). */
  help?: string;
  options?: FieldOption[];
  relation?: RelationMeta;
  required?: boolean;
  /** Warunkowa widoczność/zależności — pole renderowane tylko gdy zwróci `true` dla bieżących wartości. */
  visibleWhen?: (values: Record<string, unknown>) => boolean;
}

/**
 * Źródło opcji pól relacji: generyczny, async fetcher wstrzykiwany przez skorupę. Dostaje `relation`
 * (encja docelowa + `displayField`) i frazę wyszukiwania; zwraca surowe wiersze encji (z `id`).
 * Label liczy `RelationControl` z `relation.displayField` — dzięki temu ta sama encja-cel może być
 * pokazywana różnymi polami (np. `task` po `title` w jednym miejscu, po `priority` w innym).
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
 * Pole relacji: async-fetch opcji przez wstrzyknięty `relationSource` (jeden `useQuery` na pole →
 * zgodne z rules-of-hooks). Label liczony z `relation.displayField`. `onSearch` odświeża zapytanie
 * (server-side `?q` tam, gdzie wspierane), a wynik jest dodatkowo filtrowany lokalnie po label
 * (filtr-po-wpisaniu działa też dla encji bez `?q`).
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
 * JAWNE mapowanie „typ pola (control) → komponent DS". Jedyne miejsce, gdzie decydujemy, czym
 * renderować dany typ. Nowy typ pola = nowy `case` + wpis w przepisie/inwentarzu.
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
    // DS (read-only) nie ma osobnej kontrolki daty z godziną — składamy ją z prymitywu `Input`,
    // tak samo jak `text` i `number`. Wartość to `YYYY-MM-DDTHH:mm` w czasie LOKALNYM przeglądarki;
    // `z.coerce.date()` na granicy API interpretuje ją jako czas lokalny serwera.
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

/** Pole = etykieta (+ `*` gdy wymagane) + kontrolka DS + podpowiedź (`help`) + komunikat błędu. */
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

/** Renderuje pojedyncze pole: wrapper `Field` + kontrolka z mapowania. */
export function FieldRenderer(props: FieldRendererProps) {
  return (
    <Field field={props.field} error={props.error}>
      <Control {...props} />
    </Field>
  );
}
