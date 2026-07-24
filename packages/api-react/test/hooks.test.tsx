import { createApiClient } from "@repo/api-client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { ApiProvider, useApiClient, useCreateProject, useProjects } from "../src/index.js";

/** Wrapper: prawdziwy klient z mock-fetch + QueryClientProvider + ApiProvider (pełny stack). */
function makeWrapper(fetchImpl: typeof globalThis.fetch) {
  const client = createApiClient({ baseUrl: "http://api.test", fetch: fetchImpl });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ApiProvider client={client}>{children}</ApiProvider>
      </QueryClientProvider>
    );
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("hooki api-react (mock transport)", () => {
  it("useProjects pobiera listę i zwraca typowane dane", async () => {
    const wrapper = makeWrapper(async () =>
      jsonResponse({
        items: [{ id: "1", name: "Alpha", status: "active" }],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      }),
    );

    const { result } = renderHook(() => useProjects({ status: "active" }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items[0]?.name).toBe("Alpha");
    expect(result.current.data?.meta.total).toBe(1);
  });

  it("useCreateProject wysyła POST i rozpakowuje odpowiedź", async () => {
    const calls: Request[] = [];
    const wrapper = makeWrapper(async (input) => {
      calls.push(input as Request);
      return jsonResponse({ id: "new", name: "Beta", status: "active" }, 201);
    });

    const { result } = renderHook(() => useCreateProject(), { wrapper });
    const created = await result.current.mutateAsync({
      name: "Beta",
      status: "active",
      startDate: "2026-01-01T00:00:00.000Z",
      endDate: "2026-02-01T00:00:00.000Z",
    });

    expect(created.id).toBe("new");
    expect(calls[0]!.method).toBe("POST");
    expect(new URL(calls[0]!.url).pathname).toBe("/api/v1/projects/");
  });

  it("błąd HTTP trafia do stanu error (unwrap rzuca)", async () => {
    const wrapper = makeWrapper(async () => jsonResponse({ title: "Not Found", status: 404 }, 404));

    const { result } = renderHook(() => useProjects(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("useApiClient rzuca poza <ApiProvider>", () => {
    expect(() => renderHook(() => useApiClient())).toThrow(/ApiProvider/);
  });
});
