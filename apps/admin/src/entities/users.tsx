import {
  type InviteUserBody,
  type UpdateUserRolesBody,
  type UserList,
  type UserListQuery,
  useDeactivateUser,
  useInviteUser,
  useReactivateUser,
  useSendPasswordReset,
  useUpdateUserRoles,
  useUser,
  useUsers,
} from "@repo/api-react";
import { Badge, Button, Checkbox, Input, Modal, Select, useToast } from "@repo/design-system";
import { type Column, DataTable } from "@repo/ui";
import { useNavigate, useParams } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { formatDate, Page } from "../ui";

// Role przypisywalne w panelu. Źródło prawdy po stronie API: APP_ROLES (modules/auth/rbac.ts) —
// walidacja i tak dzieje się na serwerze; tu tylko lista do zaznaczania.
const ROLE_OPTIONS = ["user", "admin"] as const;

type UserRow = UserList["items"][number];

function RolesBadges({ roles }: { roles: string[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {roles.map((r) => (
        <Badge key={r}>{r}</Badge>
      ))}
    </span>
  );
}

export function UsersList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"active" | "inactive" | "all">("active");

  // Endpoint listy userów nie wspiera sortowania po kolumnach (porządek: e-mail rosnąco).
  const query = useUsers({ page, status: status as UserListQuery["status"] });

  const columns: Column<UserRow>[] = [
    { key: "email", header: "E-mail" },
    { key: "roles", header: "Role", render: (row) => <RolesBadges roles={row.roles} /> },
    {
      key: "active",
      header: "Status",
      render: (row) => <Badge>{row.active ? "Aktywny" : "Nieaktywny"}</Badge>,
    },
    { key: "createdAt", header: "Utworzono", render: (row) => formatDate(row.createdAt) },
  ];

  return (
    <Page
      title="Użytkownicy"
      actions={
        <Button variant="secondary" onClick={() => navigate({ to: "/users/new" })}>
          Zaproś użytkownika
        </Button>
      }
    >
      <DataTable
        columns={columns}
        rows={query.data?.items ?? []}
        getRowId={(row) => row.id}
        isLoading={query.isLoading}
        error={query.error}
        pagination={query.data?.meta}
        onPageChange={setPage}
        onRowClick={(row) => navigate({ to: "/users/$id", params: { id: row.id } })}
        toolbar={
          <Select
            aria-label="Filtr: status"
            options={[
              { value: "active", label: "Aktywni" },
              { value: "inactive", label: "Nieaktywni" },
              { value: "all", label: "Wszyscy" },
            ]}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as "active" | "inactive" | "all");
              setPage(1);
            }}
          />
        }
      />
    </Page>
  );
}

/** Zaznaczanie ról (checkboxy) — wspólne dla detalu i zaproszenia. */
function RolesPicker({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (roles: string[]) => void;
  disabled?: boolean;
}) {
  const toggle = (role: string, checked: boolean) =>
    onChange(checked ? [...new Set([...value, role])] : value.filter((r) => r !== role));
  return (
    <div className="flex gap-4">
      {ROLE_OPTIONS.map((role) => (
        <label key={role} className="flex items-center gap-2 text-sm">
          <Checkbox
            id={`role-${role}`}
            checked={value.includes(role)}
            disabled={disabled}
            onChange={(event) => toggle(role, event.target.checked)}
          />
          {role}
        </label>
      ))}
    </div>
  );
}

export function UserDetail() {
  const { id } = useParams({ strict: false });
  const { toast } = useToast();
  const query = useUser(id ?? "");
  const updateRoles = useUpdateUserRoles();
  const deactivate = useDeactivateUser();
  const reactivate = useReactivateUser();
  const passwordReset = useSendPasswordReset();
  const [roles, setRoles] = useState<string[] | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (query.isLoading) {
    return <Page title="Użytkownik">Ładowanie…</Page>;
  }
  if (query.isError || !query.data) {
    return <Page title="Użytkownik">Nie znaleziono.</Page>;
  }

  const user = query.data;
  const selectedRoles = roles ?? user.roles;

  return (
    <Page
      title={user.email}
      actions={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={passwordReset.isPending}
            onClick={() =>
              passwordReset.mutate(user.id, {
                onSuccess: () => toast("Wysłano e-mail resetujący hasło.", "success"),
                onError: () => toast("Nie udało się wysłać e-maila.", "error"),
              })
            }
          >
            Wyślij reset hasła
          </Button>
          {user.active ? (
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Dezaktywuj
            </Button>
          ) : (
            <Button
              disabled={reactivate.isPending}
              onClick={() =>
                reactivate.mutate(user.id, {
                  onSuccess: () => toast("Reaktywowano.", "success"),
                  onError: () => toast("Nie udało się reaktywować.", "error"),
                })
              }
            >
              Reaktywuj
            </Button>
          )}
        </div>
      }
    >
      <dl className="grid max-w-lg grid-cols-[10rem_1fr] gap-y-2 text-sm">
        <dt className="text-slate-500">E-mail</dt>
        <dd className="text-slate-800">{user.email}</dd>
        <dt className="text-slate-500">Status</dt>
        <dd className="text-slate-800">{user.active ? "Aktywny" : "Nieaktywny"}</dd>
        <dt className="text-slate-500">Utworzono</dt>
        <dd className="text-slate-800">{formatDate(user.createdAt)}</dd>
      </dl>

      <div className="mt-6 max-w-lg">
        <h2 className="mb-2 text-sm font-medium text-slate-700">Role</h2>
        <RolesPicker value={selectedRoles} onChange={setRoles} disabled={!user.active} />
        <Button
          className="mt-3"
          disabled={updateRoles.isPending || selectedRoles.length === 0}
          onClick={() =>
            updateRoles.mutate(
              { id: user.id, body: { roles: selectedRoles } as UpdateUserRolesBody },
              {
                onSuccess: () => {
                  toast("Zapisano role.", "success");
                  setRoles(null);
                },
                onError: () => toast("Nie udało się zapisać ról.", "error"),
              },
            )
          }
        >
          Zapisz role
        </Button>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Dezaktywować użytkownika?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Anuluj
            </Button>
            <Button
              variant="danger"
              disabled={deactivate.isPending}
              onClick={() =>
                deactivate.mutate(user.id, {
                  onSuccess: () => {
                    toast("Dezaktywowano.", "success");
                    setConfirmOpen(false);
                  },
                  onError: () => toast("Nie udało się dezaktywować.", "error"),
                })
              }
            >
              Dezaktywuj
            </Button>
          </>
        }
      >
        Konto zostanie zablokowane (soft delete), a sesje unieważnione. Można je później
        reaktywować.
      </Modal>
    </Page>
  );
}

export function UserInvite() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const invite = useInviteUser();
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<string[]>(["user"]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const created = await invite.mutateAsync({ email, roles } as InviteUserBody);
      toast("Zaproszono — wysłano e-mail z linkiem do ustawienia hasła.", "success");
      navigate({ to: "/users/$id", params: { id: created.id } });
    } catch {
      toast("Nie udało się zaprosić (e-mail zajęty?).", "error");
    }
  };

  return (
    <Page title="Zaproś użytkownika">
      <form onSubmit={onSubmit} className="flex max-w-lg flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          E-mail
          <Input
            type="email"
            value={email}
            required
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Role</span>
          <RolesPicker value={roles} onChange={setRoles} />
        </div>
        <div>
          <Button type="submit" disabled={invite.isPending || email === "" || roles.length === 0}>
            Wyślij zaproszenie
          </Button>
        </div>
      </form>
    </Page>
  );
}
