import { Badge, Button } from "@repo/design-system";
import { EmptyState } from "@repo/ui";

/**
 * Domyślna skorupa (publiczna). Minimalny landing dowodzący, że `apps/web` startuje na TYCH SAMYCH
 * pakietach co admin (DS, packages/ui, api-*) i respektuje granicę (router/env tylko tu, nie w pakietach).
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
