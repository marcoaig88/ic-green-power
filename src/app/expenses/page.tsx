import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney, CATEGORY_LABELS } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

export default async function ExpensesPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const expenses = await prisma.expense.findMany({
    where: user.role === "admin" ? undefined : { userId: user.id },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="brand-title brand-title--ink text-3xl sm:text-4xl">Note spese</h1>
          <p className="brand-subtitle brand-subtitle--ink mt-1 text-sm">
            {user.role === "admin"
              ? "Tutte le spese del team"
              : "Le tue spese caricate e in lavorazione"}
          </p>
        </div>
        <Link
          href="/expenses/new"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-deep"
        >
          Nuova spesa
        </Link>
      </div>

      {expenses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-white/50 px-6 py-16 text-center">
          <p className="text-ink">Nessuna nota spesa ancora.</p>
          <p className="mt-1 text-sm text-muted">Carica il primo scontrino per iniziare.</p>
          <Link
            href="/expenses/new"
            className="mt-4 inline-block text-sm font-medium text-brand hover:text-brand-deep"
          >
            Carica scontrino →
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white/70">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Fornitore</th>
                {user.role === "admin" && (
                  <th className="px-4 py-3 font-medium">Dipendente</th>
                )}
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Importo</th>
                <th className="px-4 py-3 font-medium">Stato</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-b border-line/70 last:border-0">
                  <td className="px-4 py-3">
                    <Link href={`/expenses/${expense.id}`} className="hover:text-brand">
                      {formatDate(expense.expenseDate || expense.createdAt)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/expenses/${expense.id}`} className="font-medium hover:text-brand">
                      {expense.merchant || "Da completare"}
                    </Link>
                  </td>
                  {user.role === "admin" && (
                    <td className="px-4 py-3 text-muted">{expense.user.name}</td>
                  )}
                  <td className="px-4 py-3 text-muted">
                    {expense.category
                      ? CATEGORY_LABELS[expense.category] || expense.category
                      : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatMoney(expense.amount, expense.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={expense.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
