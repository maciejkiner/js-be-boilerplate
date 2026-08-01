import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  uptime: z.number(),
  timestamp: z.string(),
});

/**
 * Liveness probe. Celowo poza `/api/v1` — to endpoint infrastrukturalny,
 * which is not subject to API versioning.
 */
export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/health",
    {
      schema: {
        tags: ["system"],
        summary: "Health check",
        response: { 200: HealthResponseSchema },
      },
    },
    async () => ({
      status: "ok" as const,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }),
  );
};
