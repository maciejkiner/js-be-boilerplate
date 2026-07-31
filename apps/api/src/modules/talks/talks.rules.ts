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
 * Nachodzenia przedziałów **celowo nie ma tutaj** — liczy je SQL w
 * `talksRepository.findOverlappingInRoom` (`starts_at < :endsAt AND ends_at > :startsAt`), żeby nie
 * wciągać wszystkich prelekcji sali do pamięci. Warunek jest ten sam: przedziały są domknięte
 * z lewej i otwarte z prawej, więc nierówności są OSTRE — prelekcja kończąca się o 10:00 i ta
 * zaczynająca o 10:00 stoją obok siebie, a nie kolidują.
 */
