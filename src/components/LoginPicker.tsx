"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const [error, setError] = useState<string | null>(null);

  async function selectUser(user: LoginUser) {
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
      router.push("/expenses");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
      setLoadingId(null);
    }
  }

  const admins = users.filter((u) => u.role === "admin");
  const employees = users.filter((u) => u.role !== "admin");

  return (
    <div className="w-full max-w-lg space-y-5 rounded-2xl border border-white/60 bg-white/90 p-5 shadow-[0_16px_50px_rgba(0,0,0,0.18)] backdrop-blur-md sm:p-6">
      <div>
        <h2 className="font-display text-xl font-bold text-brand-deep">Chi sei?</h2>
        <p className="mt-1 text-sm font-medium text-muted">
          Seleziona il tuo profilo per entrare
        </p>
      </div>

      {admins.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-brand">Amministrazione</p>
          <div className="space-y-2">
            {admins.map((user) => (
              <UserButton
                key={user.id}
                user={user}
                loading={loadingId === user.id}
                disabled={loadingId != null}
                onSelect={selectUser}
              />
            ))}
          </div>
        </section>
      )}

      {employees.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Dipendenti</p>
          <div className="space-y-2">
            {employees.map((user) => (
              <UserButton
                key={user.id}
                user={user}
                loading={loadingId === user.id}
                disabled={loadingId != null}
                onSelect={selectUser}
              />
            ))}
          </div>
        </section>
      )}

      {error && <p className="text-sm font-medium text-danger">{error}</p>}
    </div>
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
  const isAdmin = user.role === "admin";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(user)}
      className="flex w-full items-center gap-3 rounded-xl border border-line bg-white px-3 py-3 text-left transition hover:border-brand hover:bg-brand-soft/50 disabled:cursor-wait disabled:opacity-70"
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
          isAdmin ? "bg-brand-deep" : "bg-brand"
        }`}
      >
        {initials(user.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-ink">{user.name}</span>
        <span className="block truncate text-sm text-muted">{user.email}</span>
      </span>
      <span
        className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold ${
          isAdmin ? "bg-brand-soft text-brand-deep" : "bg-bg-accent text-muted"
        }`}
      >
        {loading ? "…" : isAdmin ? "Admin" : "Dipendente"}
      </span>
    </button>
  );
}
