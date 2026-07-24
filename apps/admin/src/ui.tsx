import { Spinner } from "@repo/design-system";
import type { ReactNode } from "react";

/** Nagłówek widoku + slot akcji + treść. */
export function Page({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Pełnoekranowy spinner (np. gdy weryfikujemy sesję). */
export function FullSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner label="Ładowanie…" />
    </div>
  );
}

/** Data ISO → format lokalny (pl-PL) albo „—" dla braku. */
export function formatDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString("pl-PL") : "—";
}
