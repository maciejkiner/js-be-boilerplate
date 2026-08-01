import { describe, expect, it } from "vitest";
import { createApiClient } from "../src/index.js";

/** A transport mock: records the requests and returns the given JSON response. */
function mockTransport(body: unknown, status = 200) {
  const calls: Request[] = [];
  const fetch: typeof globalThis.fetch = async (input) => {
    calls.push(input as Request);
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  };
  return { calls, fetch };
}

describe("createApiClient", () => {
  it("a list GET builds the URL with query parameters and returns typed data", async () => {
    const { calls, fetch } = mockTransport({
      items: [{ id: "1", name: "Alpha", status: "active" }],
      meta: { page: 2, pageSize: 10, total: 1, totalPages: 1 },
    });
    const client = createApiClient({ baseUrl: "http://api.test", fetch });

    const { data, error } = await client.GET("/api/v1/projects/", {
      params: { query: { status: "active", page: 2, pageSize: 10 } },
    });

    expect(error).toBeUndefined();
    expect(data?.items[0]?.name).toBe("Alpha");
    expect(data?.meta.page).toBe(2);

    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/api/v1/projects/");
    expect(url.searchParams.get("status")).toBe("active");
    expect(url.searchParams.get("page")).toBe("2");
    expect(calls[0]!.method).toBe("GET");
    // Auth cookies are sent cross-origin (web/admin ↔ api).
    expect(calls[0]!.credentials).toBe("include");
  });

  it("a create POST sends a JSON body", async () => {
    const created = { id: "abc", name: "Beta", status: "active" };
    const { calls, fetch } = mockTransport(created, 201);
    const client = createApiClient({ baseUrl: "http://api.test", fetch });

    const { data } = await client.POST("/api/v1/projects/", {
      body: {
        name: "Beta",
        status: "active",
        startDate: "2026-01-01T00:00:00.000Z",
        endDate: "2026-02-01T00:00:00.000Z",
      },
    });

    expect(data?.id).toBe("abc");
    expect(calls[0]!.method).toBe("POST");
    const sentBody = await calls[0]!.clone().json();
    expect(sentBody).toMatchObject({ name: "Beta", status: "active" });
  });

  it("interpolates path parameters (:id)", async () => {
    const { calls, fetch } = mockTransport({ id: "42", name: "X", status: "active" });
    const client = createApiClient({ baseUrl: "http://api.test", fetch });

    await client.GET("/api/v1/projects/{id}", { params: { path: { id: "42" } } });

    expect(new URL(calls[0]!.url).pathname).toBe("/api/v1/projects/42");
  });
});
