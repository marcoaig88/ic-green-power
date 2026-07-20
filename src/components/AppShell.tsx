"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  user: { name: string; email: string; role: string };
  children: React.ReactNode;
};

export function AppShell({ user, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const nav = [
    ...(user.role === "admin"
      ? [
          { href: "/admin", label: "Dashboard" },
          { href: "/admin/team", label: "Dipendenti" },
        ]
      : []),
    { href: "/expenses", label: "Note spese" },
    { href: "/expenses/new", label: "Nuova spesa" },
  ];

  function isActive(href: string) {
    if (pathname === href) return true;
    if (href === "/expenses") {
      return (
        pathname.startsWith("/expenses/") && !pathname.startsWith("/expenses/new")
      );
    }
    return false;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-8 rounded-2xl border border-white/50 bg-white/85 px-4 py-4 shadow-[0_10px_40px_rgba(10,40,20,0.12)] backdrop-blur-md sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="brand-title brand-title--ink text-3xl sm:text-4xl">IC Green Power</p>
            <p className="brand-subtitle brand-subtitle--ink mt-1 text-sm tracking-wide">
              Note spese
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <nav className="flex flex-wrap gap-3 font-semibold">
              {nav.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`border-b-2 pb-1 transition-colors ${
                      active
                        ? "border-brand text-brand-deep"
                        : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="text-right">
              <p className="font-semibold text-ink">{user.name}</p>
              <p className="text-xs font-medium text-muted">
                {user.role === "admin" ? "Admin" : "Dipendente"}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-line bg-white px-3 py-1.5 font-semibold text-muted transition hover:border-brand hover:text-brand-deep"
            >
              Esci
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 pb-10">{children}</main>
    </div>
  );
}
