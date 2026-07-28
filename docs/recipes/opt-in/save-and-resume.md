# Opt-in: save & resume (persystencja częściowego stanu wizarda)

**Nie zaimplementowane w bootstrapie.** Silnik formularzy (`packages/forms` `useWizard`) celowo NIE
persystuje stanu — to opt-in. Włącz, gdy wizardy są długie i użytkownik ma wracać do nich później.

## Interfejs

```ts
export interface DraftStore {
  save(key: string, state: unknown): Promise<void>;
  load(key: string): Promise<unknown | null>;
  clear(key: string): Promise<void>;
}
```

- `key` = np. `${userId}:${wizardId}`.
- Backend: tabela `wizard_drafts` (key, user_id, payload jsonb, updated_at) **albo** KV (Redis).

## Przepis (skrót)

1. `DraftStore` + adapter (DB jsonb lub Redis). Endpoint `PUT/GET/DELETE /drafts/:key` (auth,
   scoped do usera).
2. **Wpięcie w `useWizard`:** przy zmianie wartości/kroku → debounced `save(key, wizard.values)`;
   przy montażu → `load(key)` i użyj jako `defaultValues`; po `onComplete` → `clear(key)`.
   (Rozszerz `useWizard` o opcjonalne `persist?: DraftStore` — bez zmiany domyślnego zachowania.)
3. **FE:** wskaźnik „zapisano roboczo" + wznów przy wejściu.

## Uwagi

Payload draftu może zawierać dane wrażliwe — szyfrowanie/retencja wg polityki. Waliduj załadowany
draft schematem kroku przed użyciem (mógł się zmienić kontrakt).
