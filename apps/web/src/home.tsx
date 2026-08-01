import { Badge, Button } from "@repo/design-system";
import { EmptyState } from "@repo/ui";

/**
 * The default (public) shell. A minimal landing page proving that `apps/web` runs on THE SAME
 * packages as admin (the DS, packages/ui, api-*) and respects the boundary (the router and the env
 * live here, never in the packages).
 */
export function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 p-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Bootstrap TypeScript</h1>
        <Badge tone="info">web</Badge>
      </div>
      <p className="text-slate-600">
        Skorupa publiczna na współdzielonych pakietach. Panel administracyjny działa jako osobna
        skorupa (subdomena) na tych samych komponentach i kliencie API.
      </p>
      <EmptyState
        title="Tu powstaną widoki publiczne"
        description="Domyślna skorupa jest celowo cienka — realne widoki dokładasz w projekcie."
        action={
          <Button onClick={() => window.open("http://localhost:5174", "_self")}>
            Przejdź do panelu
          </Button>
        }
      />
    </main>
  );
}
