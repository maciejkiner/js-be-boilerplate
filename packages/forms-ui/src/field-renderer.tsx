import {
  Checkbox,
  Combobox,
  DateInput,
  Input,
  RadioGroup,
  Select,
  type SelectOption,
  Switch,
  Textarea,
} from "@repo/design-system";
import type { FieldControl, FieldOption, RelationMeta } from "@repo/schemas";
import type { ReactNode } from "react";

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

/** Źródło opcji pól relacji (wstrzykiwane przez skorupę — dociąga z API). */
export type RelationSource = (relation: RelationMeta) => {
  options: SelectOption[];
  onSearch?: (query: string) => void;
  loading?: boolean;
};

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
    case "relation": {
      const source =
        field.relation && relationSource
          ? relationSource(field.relation)
          : { options: [] as SelectOption[] };
      return (
        <Combobox
          value={(value as string) ?? ""}
          onValueChange={onChange}
          options={source.options}
          onSearch={source.onSearch}
          loading={source.loading}
          disabled={disabled}
        />
      );
    }
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
