import { redirect, unstable_rethrow } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LoginPicker } from "@/components/LoginPicker";
import { homePathForRole, isAdminIt, isManager } from "@/lib/roles";
import { fullName } from "@/lib/user";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSessionUser();
  if (session) redirect(homePathForRole(session.role));

  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, surname: true, email: true, role: true },
      orderBy: [{ role: "asc" }, { surname: "asc" }, { name: "asc" }],
    });

    // Admin IT non compare tra i profili selezionabili
    const selectable = users
      .filter((u) => !isAdminIt(u.role))
      .map((u) => ({
        id: u.id,
        name: fullName(u),
        email: u.email,
        role: u.role,
      }));
    const sorted = [...selectable].sort((a, b) => {
      const rank = (role: string) => (isManager(role) ? 0 : 1);
      const diff = rank(a.role) - rank(b.role);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name, "it");
    });

    return (
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10">
        <div className="mb-8">
          <h1 className="brand-title text-5xl sm:text-6xl">IC Green Power</h1>
          <p className="brand-subtitle mt-3 text-base tracking-wide">
            Energia solare · note spese del team
          </p>
        </div>

        <LoginPicker users={sorted} />
      </div>
    );
  } catch (error) {
    unstable_rethrow(error);
    console.error("Login page DB error:", error);
    const message = error instanceof Error ? error.message : "Errore sconosciuto";

    return (
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10">
        <h1 className="brand-title text-4xl">IC Green Power</h1>
        <p className="brand-subtitle mt-4 text-base">
          Errore di connessione al database. Riprova tra poco.
        </p>
        <p className="mt-3 break-words rounded-xl border border-white/50 bg-white/90 p-4 text-sm text-danger">
          {message}
        </p>
      </div>
    );
  }
}
