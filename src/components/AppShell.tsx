"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  canAccessDashboard,
  canApproveExpenses,
  canManageUsers,
  roleLabel,
} from "@/lib/roles";

type Props = {
  user: { name: string; email: string; role: string };
  /** Badge Attività: note da approvare. */
  pendingApprovalsCount?: number;
  children: React.ReactNode;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppShell({ user, pendingApprovalsCount = 0, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const nav = [
    ...(canAccessDashboard(user.role)
      ? [{ href: "/admin", label: "Dashboard" }]
      : []),
    ...(canApproveExpenses(user.role)
      ? [{ href: "/admin/attivita", label: "Attività", badge: pendingApprovalsCount }]
      : []),
    ...(canManageUsers(user.role)
      ? [{ href: "/admin/team", label: "Dipendenti" }]
      : []),
    { href: "/expenses", label: "Note spese" },
    { href: "/expenses/new", label: "Nuova spesa" },
  ];

  function isActive(href: string) {
    if (pathname === href) return true;
    if (href === "/admin") {
      return pathname === "/admin";
    }
    if (href === "/expenses") {
      return (
        pathname.startsWith("/expenses/") && !pathname.startsWith("/expenses/new")
      );
    }
    return pathname.startsWith(href);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-8 rounded-2xl border border-white/50 bg-white/90 px-4 py-4 shadow-[0_10px_40px_rgba(10,40,20,0.12)] backdrop-blur-md sm:px-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="brand-title brand-title--ink text-3xl sm:text-4xl">
                IC Green Power
              </p>
              <p className="brand-subtitle brand-subtitle--ink mt-1 text-sm tracking-wide">
                Note spese
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-brand/25 bg-brand-soft/70 px-3 py-2 shadow-sm">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-extrabold text-white"
                  aria-hidden
                >
                  {initials(user.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-brand-deep">
                    {user.name}
                  </p>
                  <p className="mt-0.5 inline-flex rounded-md bg-white/90 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand">
                    {roleLabel(user.role)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-bold text-muted transition hover:border-brand hover:text-brand-deep"
              >
                Esci
              </button>
            </div>
          </div>

          <nav
            className="flex flex-wrap gap-2 border-t border-line/70 pt-3"
            aria-label="Menu principale"
          >
            {nav.map((item) => {
              const active = isActive(item.href);
              const badge =
                "badge" in item && typeof item.badge === "number" && item.badge > 0
                  ? item.badge
                  : null;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-bold transition ${
                    active
                      ? "border border-brand bg-brand !text-white shadow-sm hover:!text-white"
                      : "border border-line bg-white text-ink hover:border-brand hover:bg-brand-soft/60 hover:text-brand-deep"
                  }`}
                >
                  {item.label}
                  {badge != null && (
                    <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-md bg-[#c62828] px-1.5 py-0.5 text-[11px] font-extrabold leading-none text-white">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="flex-1 pb-10">{children}</main>
    </div>
  );
}
