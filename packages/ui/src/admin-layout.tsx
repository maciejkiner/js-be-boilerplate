import type { ReactNode } from "react";

export interface AdminLayoutProps {
  brand: ReactNode;
  /** Navigation — the SHELL supplies the router links (packages/ui knows no router). */
  nav: ReactNode;
  /** Header actions (the signed-in user's e-mail, sign out, …). */
  actions?: ReactNode;
  /** The panel footer — a place for technical information (build time, debug flags). The shell
   * injects the content, because the data comes from `import.meta.env`/`define` (unknown here). */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * The admin panel skeleton (sidebar + header + main). Router-agnostic: `nav` and `actions` are slots
 * into which the shell injects its `<Link>`s. That is what keeps the "router only in apps/*" boundary.
 */
export function AdminLayout({ brand, nav, actions, footer, children }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-14 items-center px-4 text-lg font-semibold">{brand}</div>
        <nav className="flex flex-col gap-1 p-2" aria-label="Główna nawigacja">
          {nav}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-3 border-b border-slate-200 bg-white px-6">
          {actions}
        </header>
        <main className="min-w-0 flex-1 p-6">{children}</main>
        {footer && (
          <footer className="border-t border-slate-200 bg-white px-6 py-2 text-xs text-slate-500">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
