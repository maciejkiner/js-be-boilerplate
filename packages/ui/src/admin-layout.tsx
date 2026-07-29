import type { ReactNode } from "react";

export interface AdminLayoutProps {
  brand: ReactNode;
  /** Nawigacja — SKORUPA podaje linki routera (packages/ui nie zna routera). */
  nav: ReactNode;
  /** Akcje w nagłówku (np. e-mail zalogowanego, wyloguj). */
  actions?: ReactNode;
  /** Stopka panelu — miejsce na informacje techniczne (build time, flagi debug). Skorupa wstrzykuje
   * treść, bo dane pochodzą z `import.meta.env`/`define` (packages/ui ich nie zna). */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Szkielet panelu admina (sidebar + header + main). Router-agnostyczny: `nav`/`actions` to sloty,
 * do których skorupa wstrzykuje `<Link>`i. Dzięki temu granica „router tylko w apps/*" trzyma.
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
