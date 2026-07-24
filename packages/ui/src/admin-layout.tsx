import type { ReactNode } from "react";

export interface AdminLayoutProps {
  brand: ReactNode;
  /** Nawigacja — SKORUPA podaje linki routera (packages/ui nie zna routera). */
  nav: ReactNode;
  /** Akcje w nagłówku (np. e-mail zalogowanego, wyloguj). */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Szkielet panelu admina (sidebar + header + main). Router-agnostyczny: `nav`/`actions` to sloty,
 * do których skorupa wstrzykuje `<Link>`i. Dzięki temu granica „router tylko w apps/*" trzyma.
 */
export function AdminLayout({ brand, nav, actions, children }: AdminLayoutProps) {
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
      </div>
    </div>
  );
}
