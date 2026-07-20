import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { PendingApprovals } from "@/components/PendingApprovals";
import { fullName } from "@/lib/user";
import {
  canApproveExpenses,
  isCfo,
  isCoo,
} from "@/lib/roles";
import {
  loadPendingExpenses,
  splitPendingForActor,
} from "@/lib/pending-approvals";

export const dynamic = "force-dynamic";

function sumAmounts(rows: { amount: number | null }[]) {
  return rows.reduce((acc, row) => acc + (row.amount || 0), 0);
}

export default async function AttivitaPage() {
  const user = await getSessionUser();
  if (!user) return null;
  if (!canApproveExpenses(user.role)) redirect("/admin");

  const actor = { id: user.id, role: user.role };
  const pending = await loadPendingExpenses(actor);
  const { approvable, ownCfo } = splitPendingForActor(actor, pending);

  const subtitle = isCoo(user.role)
    ? "Note spese del CFO da approvare"
    : "Cosa richiede la tua attenzione";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="brand-title brand-title--ink text-3xl sm:text-4xl">
          Attività
        </h1>
        <p className="brand-subtitle brand-subtitle--ink mt-1 text-sm">
          {subtitle}
        </p>
      </div>

      <section className="rounded-xl border border-line bg-white/80 p-5">
        <div className="mb-4">
          <h2 className="font-display text-lg font-bold text-brand-deep">
            {isCoo(user.role) ? "Da approvare (CFO)" : "Da approvare"}
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            {approvable.length === 0
              ? "Nessuna spesa in attesa"
              : `${approvable.length} · ${formatMoney(sumAmounts(approvable))}`}
          </p>
        </div>
        <PendingApprovals
          expenses={approvable.map((expense) => ({
            ...expense,
            user: { name: fullName(expense.user) },
            canApprove: true,
          }))}
          emptyMessage={
            isCoo(user.role)
              ? "Nessuna spesa del CFO in attesa."
              : "Nessuna spesa da approvare. Ottimo lavoro."
          }
        />
      </section>

      {isCfo(user.role) && (
        <section className="rounded-xl border border-amber-300/80 bg-amber-50/80 p-5">
          <div className="mb-4">
            <h2 className="font-display text-lg font-bold text-amber-950">
              Le tue spese (in attesa del COO)
            </h2>
            <p className="mt-0.5 text-xs text-amber-900/80">
              Non puoi approvare le tue note spese — le gestisce il COO
              {ownCfo.length > 0
                ? ` · ${ownCfo.length} · ${formatMoney(sumAmounts(ownCfo))}`
                : ""}
            </p>
          </div>
          <PendingApprovals
            expenses={ownCfo.map((expense) => ({
              ...expense,
              user: { name: fullName(expense.user) },
              canApprove: false,
              highlight: true,
            }))}
            emptyMessage="Nessuna tua spesa in attesa del COO."
          />
        </section>
      )}
    </div>
  );
}
