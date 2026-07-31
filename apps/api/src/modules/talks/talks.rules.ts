/**
 * Reguły czasowe prelekcji — CZYSTE predykaty, bez dostępu do bazy.
 *
 * Wydzielone z service'u celowo: to jedyny fragment tych reguł z realnym ryzykiem pomyłki
 * (granice przedziałów), a tutaj testuje się go bez Postgresa.
 */

export interface Interval {
  startsAt: Date;
  endsAt: Date;
}

/**
 * Czy przedział `inner` mieści się w całości wewnątrz `outer`. Granice mogą się pokrywać —
 * prelekcja może zaczynać się dokładnie z początkiem wydarzenia i kończyć z jego końcem.
 */
export function intervalContains(outer: Interval, inner: Interval): boolean {
  return inner.startsAt >= outer.startsAt && inner.endsAt <= outer.endsAt;
}

/**
 * Czy dwa przedziały czasowe na siebie nachodzą.
 *
 * Przedziały są **domknięte z lewej, otwarte z prawej** — `[start, end)`, więc nierówności są OSTRE:
 * prelekcja kończąca się o 10:00 i ta zaczynająca o 10:00 stoją obok siebie, a nie kolidują.
 *
 * Ten sam warunek liczy SQL w `talksRepository.findOverlappingInRoom` (dla rekordów już zapisanych).
 * Wersja w pamięci obsługuje przypadek, którego SQL nie widzi: kolizje **wewnątrz jednej paczki**
 * przy tworzeniu hurtem, zanim cokolwiek trafi do bazy.
 */
export function intervalsOverlap(a: Interval, b: Interval): boolean {
  return a.startsAt < b.endsAt && a.endsAt > b.startsAt;
}
