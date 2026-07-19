import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LoginPicker } from "@/components/LoginPicker";

function dbDiagnostics() {
  const dbUrl = (process.env.DATABASE_URL || "").trim();
  const preview =
    dbUrl.length === 0
      ? "(vuota)"
      : `${dbUrl.slice(0, 24)}…${dbUrl.slice(-12)} (len=${dbUrl.length})`;

  try {
    const url = new URL(dbUrl);
    return {
      preview,
      host: url.host || "(vuoto)",
      username: decodeURIComponent(url.username || "(vuoto)"),
      hasPooler: dbUrl.includes("pooler.supabase.com"),
      hasPort6543: url.port === "6543" || dbUrl.includes(":6543"),
    };
  } catch {
    return {
      preview,
      host: "(DATABASE_URL non valida)",
      username: "(n/d)",
      hasPooler: false,
      hasPort6543: false,
    };
  }
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
          <p className="break-all">
            <strong>Preview env:</strong> {diag.preview}
          </p>
          <p>
            <strong>Host:</strong> {diag.host}
          </p>
          <p>
            <strong>Username:</strong> {diag.username}
          </p>
          <p>
            <strong>Pooler:</strong> {diag.hasPooler ? "sì" : "no"} ·{" "}
            <strong>Porta 6543:</strong> {diag.hasPort6543 ? "sì" : "no"}
          </p>
          <p className="break-words text-danger">
            <strong>Dettaglio:</strong> {message}
          </p>
          {diag.username === "postgres" && (
            <p className="text-warn">
              Sul pooler lo username deve essere{" "}
              <code>postgres.pfptyzithnemqoggtyww</code>, non solo{" "}
              <code>postgres</code>.
            </p>
          )}
        </div>
      </div>
    );
  }
}
