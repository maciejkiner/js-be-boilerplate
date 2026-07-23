# Architecture Decision Records

Każdą znaczącą decyzję (technologia, wzorzec, granica serwisu) zapisujemy jako ADR w tym katalogu,
używając szablonu `../../adr-template.md`.

- Nazewnictwo: `ADR-NNNN-krotki-tytul.md` (numer rosnący, cztery cyfry).
- ADR jest **immutable** — zmianę decyzji zapisujemy jako nowy ADR odwołujący się do poprzedniego.
- Format: kontekst → rozważane opcje → decyzja → konsekwencje.

Wiele decyzji jest już rozstrzygniętych w `spec/bootstrap-opis-projektu.md` — ADR-y zakładamy dla
decyzji podejmowanych w trakcie budowy bootstrapu (np. format metadanych encji, kontrakt scaffoldera).
