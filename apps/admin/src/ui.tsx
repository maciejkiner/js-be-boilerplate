import { Spinner } from "@repo/design-system";
import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { entityRegistry } from "./entities/registry";

/**
 * Okruszek rodzica dla podwidoków encji (detal/nowy/edycja/wizard). Dopasowuje bieżącą ścieżkę
 * do rejestru encji — dzięki temu breadcrumb działa dla WSZYSTKICH widoków (też scaffoldowanych),
 * bez zmian w każdym z osobna. Na liście encji (ścieżka == path) rodzica nie ma.
 */
function useParentCrumb(): { label: string; to: string } | null {
  const { pathname } = useLocation();
  const entity = entityRegistry.find(
    (e) => pathname === e.path || pathname.startsWith(`${e.path}/`),
  );
  if (!entity || pathname === entity.path) {
    return null;
  }
  return { label: entity.label, to: entity.path };
}

/** Nagłówek widoku (+ breadcrumb rodzica) + slot akcji + treść. */
export function Page({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const parent = useParentCrumb();
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          {parent && (
            <nav aria-label="Ścieżka nawigacji" className="mb-1 text-sm text-slate-500">
              <Link to={parent.to} className="hover:text-slate-700 hover:underline">
                {parent.label}
              </Link>
              <span className="mx-1.5 text-slate-400">/</span>
              <span className="text-slate-700">{title}</span>
            </nav>
          )}
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        </div>
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
