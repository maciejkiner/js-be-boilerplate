# CHANGELOG — wpisy-przepisy pod agenta

Ten changelog jest **inny niż zwykły**: to nie lista zmian bootstrapa dla ludzi, lecz **przepisy dla
agenta w sforkowanym projekcie** — jak przenieść poprawkę do kodu, który już „odjechał" od bootstrapa.

## Pętla aktualizacji (fork & forget + opcjonalny backport)

1. Projekt startuje z forka bootstrapa; `BOOTSTRAP_VERSION` zapisuje wersję startową (data + hash).
2. Gdy chcesz przenieść poprawki: weź wpisy z tego pliku **nowsze** niż data w `BOOTSTRAP_VERSION`.
3. Dla każdego wpisu agent stosuje przepis (znajdź fragment → zastąp), bo pliki mogły zostać zmienione
   (nie zakładamy czystego `git merge` — kod jest własnością projektu). Po backporcie zaktualizuj
   `BOOTSTRAP_VERSION`.

## Format wpisu

```
## YYYY-MM-DD — krótki tytuł
- **Co:** co się zmieniło/naprawiło.
- **Dlaczego:** powód (jaki problem/ryzyko).
- **Jak znaleźć w projekcie:** ścieżki/wzorce do zlokalizowania fragmentu.
- **Co zrobić:** konkretna zmiana do zastosowania (przed/po lub kroki).
- **Ryzyko/rollback:** jeśli istotne.
```

---

## 2026-07-27 — Baseline (fazy 0–9)

- **Co:** pierwsza kompletna wersja bootstrapa (monorepo, API Fastify+Zod, Drizzle, auth, encja
  referencyjna, klient z OpenAPI, skorupy web/admin, silnik formularzy, scaffolder, konteneryzacja).
- **Dlaczego:** punkt wyjścia; kolejne wpisy będą przepisami do backportu.
- **Jak znaleźć w projekcie:** całe repo; `PLAN.md` opisuje fazy, `CLAUDE.md` konwencje.
- **Co zrobić:** nic — to punkt odniesienia. Ustaw `BOOTSTRAP_VERSION` na `2026-07-27 8694bcd`.

<!-- Nowe wpisy dodawaj NA GÓRZE (pod tym komentarzem), najnowsze pierwsze. -->
