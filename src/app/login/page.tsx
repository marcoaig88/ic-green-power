import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LoginPicker } from "@/components/LoginPicker";

function dbDiagnostics() {
  const dbUrl = process.env.DATABASE_URL || "";
  return {
    host: dbUrl.split("@")[1]?.split("/")[0] || "(DATABASE_URL mancante)",
    hasPooler: dbUrl.includes("pooler.supabase.com"),
    hasPort6543: dbUrl.includes(":6543"),
  };
}

export default async function LoginPage() {
  try {
    const session = await getSessionUser();
    if (session) redirect("/expenses");

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
    console.error("Login page DB error:", error);
    const diag = dbDiagnostics();
    const message = error instanceof Error ? error.message : "Errore sconosciuto";

    return (
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10">
        <h1 className="brand-title text-4xl">IC Green Power</h1>
        <p className="brand-subtitle mt-4 text-base">Errore di connessione al database.</p>
        <div className="mt-4 space-y-2 rounded-xl border border-white/50 bg-white/90 p-4 text-sm text-ink">
          <p>
            <strong>Host:</strong> {diag.host}
          </p>
          <p>
            <strong>Pooler:</strong> {diag.hasPooler ? "sì" : "no"} ·{" "}
            <strong>Porta 6543:</strong> {diag.hasPort6543 ? "sì" : "no"}
          </p>
          <p className="break-words text-danger">
            <strong>Dettaglio:</strong> {message}
          </p>
        </div>
      </div>
    );
  }
}
