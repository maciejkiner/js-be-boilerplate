import { buildApp } from "./app.js";
import { type Env, parseEnv } from "./config/env.js";
import { createErrorTracker } from "./lib/error-tracking/index.js";

async function main(): Promise<void> {
  let env: Env;
  try {
    env = parseEnv();
  } catch (error) {
    // Logger jeszcze nie istnieje — fail-fast prosto na stderr.
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const errorTracker = await createErrorTracker(env);
  const app = await buildApp({ env, errorTracker });

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void main();
