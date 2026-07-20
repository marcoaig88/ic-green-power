"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  homePathForRole,
  isAdminIt,
  isManager,
  roleLabel,
  ROLES,
} from "@/lib/roles";

export type LoginUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function LoginPicker({ users }: { users: LoginUser[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [credLoading, setCredLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function finishLogin(role: string) {
    router.push(homePathForRole(role));
    router.refresh();
  }

  async function selectUser(user: LoginUser) {
    if (isAdminIt(user.role)) return;
    setLoadingId(user.id);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login fallito");
      await finishLogin(data.user?.role || user.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
      setLoadingId(null);
    }
  }

  async function loginWithCredentials(e: React.FormEvent) {
    e.preventDefault();
    setCredLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login fallito");
      await finishLogin(data.user?.role || ROLES.employee);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
      setCredLoading(false);
    }
  }

  const selectable = users.filter((u) => !isAdminIt(u.role));
  const responsabili = selectable.filter((u) => u.role === ROLES.responsabile);
  const employees = selectable.filter((u) => !isManager(u.role));
  const busy = loadingId != null || credLoading;

  return (
    <div className="w-full max-w-lg space-y-5 rounded-2xl border border-white/60 bg-white/90 p-5 shadow-[0_16px_50px_rgba(0,0,0,0.18)] backdrop-blur-md sm:p-6">
      <div>
        <h2 className="font-display text-xl font-bold text-brand-deep">Accedi</h2>
        <p className="mt-1 text-sm font-medium text-muted">
          Entra con utente e password, oppure seleziona un profilo
        </p>
      </div>

      <form onSubmit={loginWithCredentials} className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            Utente
          </span>
          <input
            type="text"
            name="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-medium text-ink outline-none transition focus:border-brand"
            placeholder="Utente"
            required
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            Password
          </span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-medium text-ink outline-none transition focus:border-brand"
            placeholder="Password"
            required
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-deep disabled:cursor-wait disabled:opacity-70"
        >
          {credLoading ? "Accesso…" : "Entra"}
        </button>
      </form>

      {(responsabili.length > 0 || employees.length > 0) && (
        <>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              oppure
            </span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <div>
            <h3 className="font-display text-lg font-bold text-brand-deep">Chi sei?</h3>
            <p className="mt-1 text-sm font-medium text-muted">
              Seleziona il tuo profilo per entrare
            </p>
          </div>

          {responsabili.length > 0 && (
            <RoleSection
              title="Responsabili"
              users={responsabili}
              loadingId={loadingId}
              disabled={busy}
              onSelect={selectUser}
            />
          )}

          {employees.length > 0 && (
            <RoleSection
              title="Dipendenti"
              users={employees}
              loadingId={loadingId}
              disabled={busy}
              onSelect={selectUser}
              muted
            />
          )}
        </>
      )}

      {error && <p className="text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}

function RoleSection({
  title,
  users,
  loadingId,
  disabled,
  onSelect,
  muted,
}: {
  title: string;
  users: LoginUser[];
  loadingId: string | null;
  disabled: boolean;
  onSelect: (user: LoginUser) => void;
  muted?: boolean;
}) {
  return (
    <section className="space-y-2">
      <p
        className={`text-xs font-bold uppercase tracking-wider ${
          muted ? "text-muted" : "text-brand"
        }`}
      >
        {title}
      </p>
      <div className="space-y-2">
        {users.map((user) => (
          <UserButton
            key={user.id}
            user={user}
            loading={loadingId === user.id}
            disabled={disabled}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

function UserButton({
  user,
  loading,
  disabled,
  onSelect,
}: {
  user: LoginUser;
  loading: boolean;
  disabled: boolean;
  onSelect: (user: LoginUser) => void;
}) {
  const elevated = isManager(user.role);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(user)}
      className="flex w-full items-center gap-3 rounded-xl border border-line bg-white px-3 py-3 text-left transition hover:border-brand hover:bg-brand-soft/50 disabled:cursor-wait disabled:opacity-70"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
        {initials(user.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-ink">{user.name}</span>
        <span className="block truncate text-xs text-muted">{user.email}</span>
      </span>
      <span
        className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold ${
          elevated ? "bg-brand-soft text-brand-deep" : "bg-bg-accent text-muted"
        }`}
      >
        {loading ? "…" : roleLabel(user.role)}
      </span>
    </button>
  );
}
