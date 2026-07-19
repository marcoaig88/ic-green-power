import { redirect, unstable_rethrow } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LoginPicker } from "@/components/LoginPicker";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSessionUser();
  if (session) redirect(session.role === "admin" ? "/admin" : "/expenses");

  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    const sorted = [...users].sort((a, b) => {
      if (a.role === b.role) return a.name.localeCompare(b.name, "it");
      return a.role === "admin" ? -1 : 1;
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
