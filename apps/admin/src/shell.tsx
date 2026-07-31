import { errorMessage } from "@repo/api-client";
import { Button, Input } from "@repo/design-system";
import { AdminLayout } from "@repo/ui";
import { Link, Navigate, Outlet, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { useLogin, useLogout, useMe } from "./auth";
import { entityRegistry } from "./entities/registry";
import { FullSpinner, Page } from "./ui";

const NAV_LINK =
  "rounded px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 [&.active]:bg-slate-100 [&.active]:font-medium";

function Nav() {
  return (
    <>
      <Link to="/" className={NAV_LINK}>
        Pulpit
      </Link>
      {entityRegistry.map((entity) => (
        <Link key={entity.name} to={entity.path} className={NAV_LINK}>
          {entity.label}
        </Link>
      ))}
    </>
  );
}

function UserMenu({ email }: { email: string }) {
  const logout = useLogout();
  const navigate = useNavigate();
  return (
    <>
      <span className="text-sm text-slate-500">{email}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => logout.mutate(undefined, { onSuccess: () => navigate({ to: "/login" }) })}
      >
        Wyloguj
      </Button>
    </>
  );
}

/**
 * Stopka z informacjami technicznymi. Rozszerzalna — dokładaj kolejne pozycje do `items`
 * (np. wersja API, flagi debug). Wartości pochodzą z Vite (`import.meta.env`/`__BUILD_TIME__`),
 * więc żyją TYLKO w skorupie; do `packages/ui` trafiają jako gotowy `ReactNode`.
 */
function TechInfo() {
  const items: Array<[string, string]> = [
    ["Build", new Date(__BUILD_TIME__).toLocaleString()],
    ["Env", import.meta.env.MODE],
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map(([label, value]) => (
        <span key={label}>
          <span className="text-slate-400">{label}:</span> {value}
        </span>
      ))}
    </div>
  );
}

/** Layout chroniony sesją: dopóki nie wiadomo → spinner; brak sesji → /login. */
export function ProtectedShell() {
  const me = useMe();
  if (me.isPending) {
    return <FullSpinner />;
  }
  if (me.isError || !me.data) {
    return <Navigate to="/login" />;
  }
  return (
    <AdminLayout
      brand="Admin"
      nav={<Nav />}
      actions={<UserMenu email={me.data.email} />}
      footer={<TechInfo />}
    >
      <Outlet />
    </AdminLayout>
  );
}

export function Dashboard() {
  return (
    <Page title="Pulpit">
      <p className="text-sm text-slate-600">Panel administracyjny. Wybierz encję z menu.</p>
    </Page>
  );
}

export function LoginPage() {
  const me = useMe();
  const login = useLogin();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (me.isSuccess) {
    return <Navigate to="/" />;
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    login.mutate({ email, password }, { onSuccess: () => navigate({ to: "/" }) });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <form
        onSubmit={onSubmit}
        className="flex w-80 flex-col gap-3 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-lg font-semibold text-slate-900">Logowanie</h1>
        <Input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Hasło"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {login.isError && (
          // Treść z API (celowo jednakowa dla złego e-maila i hasła — nie zdradzamy, czy konto
          // istnieje); własny tekst zastępczy tylko wtedy, gdy odpowiedzi nie było.
          <p role="alert" className="text-sm text-red-600">
            {errorMessage(login.error, "Nieprawidłowy e-mail lub hasło.")}
          </p>
        )}
        <Button type="submit" disabled={login.isPending}>
          Zaloguj
        </Button>
      </form>
    </div>
  );
}
