# Moduły opt-in — TYLKO przepisy/interfejsy

Te moduły są **świadomie NIE implementowane** w bootstrapie (spec sekcja 2/6). To przepisy +
szkice interfejsów — włączasz je **w projekcie**, gdy faktycznie potrzebne. Bootstrap zostaje
lekki („nie na zapas").

- [`multi-tenancy.md`](./multi-tenancy.md) — organizacje / zaproszenia / role per org
- [`upload-plikow.md`](./upload-plikow.md) — abstrakcja storage + upload
- [`save-and-resume.md`](./save-and-resume.md) — persystencja częściowego stanu wizarda
- [`opentelemetry.md`](./opentelemetry.md) — tracing (OTel)
- [`kolejki-jobs.md`](./kolejki-jobs.md) — kolejki / zadania w tle

Zasada: dopóki nie włączysz modułu, jego serwisy/tabele/zależności nie istnieją. Włączenie dokłada
je w projekcie (schemat, adapter, endpoint, ew. usługa w compose) wg przepisu.
