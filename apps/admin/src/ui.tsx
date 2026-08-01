import { Spinner } from "@repo/design-system";
import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { entityRegistry } from "./entities/registry";

/**
 * The parent breadcrumb for an entity's sub-views (detail, new, edit, wizard). It matches the
 * current path against the entity registry — which makes the breadcrumb work for EVERY view
 * (scaffolded ones included) without touching them one by one. On an entity list (path == path)
 * there is no parent.
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

/** The view heading (plus the parent breadcrumb), an actions slot and the content. */
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

/** A full-screen spinner (while verifying the session, for example). */
export function FullSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner label="Ładowanie…" />
    </div>
  );
}

/** An ISO date → the local (pl-PL) format, or "—" when absent. */
export function formatDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString("pl-PL") : "—";
}

/** A date with time (ISO) → the local (pl-PL) format, or "—" when absent. */
export function formatDateTime(iso: string | null | undefined): string {
  return iso
    ? new Date(iso).toLocaleString("pl-PL", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";
}
