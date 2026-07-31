import { execFileSync } from "node:child_process";

/**
 * Seed konta admina przed testami. Panel (użytkownicy, role) jest `admin`-only, a rejestracja przez
 * API daje wyłącznie rolę `user` — bez tego kroku nie da się przetestować żadnego widoku spod RBAC.
 * Seeder jest idempotentny, więc powtórne uruchomienie suite'u nic nie psuje.
 */
export default function globalSetup(): void {
  execFileSync("pnpm", ["--filter", "@repo/api", "db:seed"], {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL ?? "postgres://app:app@localhost:5432/app",
    },
  });
}
