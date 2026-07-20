import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney, CATEGORY_LABELS } from "@/lib/format";
import {
  buildExpenseWhere,
  parseExpenseFilters,
  type ExpenseFilterParams,
} from "@/lib/expense-filters";
import { StatusBadge } from "@/components/StatusBadge";
import { ExpenseFilters } from "@/components/ExpenseFilters";
import { AiConfidenceBadge } from "@/components/AiConfidenceBadge";
import { QuickApproveButton } from "@/components/QuickApproveButton";
import {
  ROLES,
  canApproveExpense,
  canApproveExpenses,
  canViewAllExpenses,
  isCfoOwnPending,
  isCoo,
  teamUsersWhere,
} from "@/lib/roles";
import { fullName } from "@/lib/user";
import { isMileageExpense } from "@/lib/mileage";

type Props = {
  searchParams: Promise<ExpenseFilterParams>;
};

export default async function ExpensesPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) return null;

  const actor = { id: user.id, role: user.role };
  const params = await searchParams;
  const filters = parseExpenseFilters(params);
  const finalWhere = buildExpenseWhere(filters, {
    role: user.role,
    sessionUserId: user.id,
  });
  const manager = canViewAllExpenses(user.role);
  const showApproveCol = canApproveExpenses(user.role);

  const teamWhere = isCoo(user.role) ? { role: ROLES.cfo } : teamUsersWhere;

  const [expenses, teamRows] = await Promise.all([
    prisma.expense.findMany({
      where: finalWhere,
      include: { user: { select: { name: true, surname: true, role: true } } },
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
    }),
    manager
      ? prisma.user.findMany({
          where: teamWhere,
          select: { id: true, name: true, surname: true },
          orderBy: [{ surname: "asc" }, { name: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  const teamUsers = teamRows.map((u) => ({ id: u.id, name: fullName(u) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="brand-title brand-title--ink text-3xl sm:text-4xl">Note spese</h1>
          <p className="brand-subtitle brand-subtitle--ink mt-1 text-sm">
            {isCoo(user.role)
              ? "Spese del CFO e le tue"
              : manager
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

      <ExpenseFilters
        isAdmin={manager}
        users={teamUsers}
        resultCount={expenses.length}
        values={filters}
      />

      {expenses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-white/50 px-6 py-16 text-center">
          <p className="text-ink">Nessuna nota spesa trovata.</p>
          <p className="mt-1 text-sm text-muted">
            Prova a modificare i filtri oppure carica un nuovo scontrino.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            <Link href="/expenses" className="text-sm font-medium text-muted hover:text-ink">
              Reset filtri
            </Link>
            <Link
              href="/expenses/new"
              className="text-sm font-medium text-brand hover:text-brand-deep"
            >
              Carica scontrino →
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white/70">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Fornitore</th>
                {manager && (
                  <th className="px-4 py-3 font-medium">Dipendente</th>
                )}
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Importo</th>
                <th className="px-4 py-3 font-medium">AI</th>
                <th className="px-4 py-3 font-medium">Stato</th>
                {showApproveCol && (
                  <th className="px-4 py-3 font-medium">Azione</th>
                )}
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => {
                const ownPending = isCfoOwnPending(actor, expense);
                const rowApprove =
                  expense.status === "submitted" &&
                  canApproveExpense(actor, {
                    userId: expense.userId,
                    user: expense.user,
                  });

                return (
                  <tr
                    key={expense.id}
                    className={`border-b border-line/70 last:border-0 ${
                      ownPending ? "bg-amber-50/80" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/expenses/${expense.id}`} className="hover:text-brand">
                        {formatDate(expense.expenseDate || expense.createdAt)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/expenses/${expense.id}`}
                        className="font-medium hover:text-brand"
                      >
                        {expense.merchant || "Da completare"}
                      </Link>
                      {ownPending && (
                        <p className="mt-0.5 text-xs font-semibold text-amber-800">
                          In attesa del COO
                        </p>
                      )}
                    </td>
                    {manager && (
                      <td className="px-4 py-3 text-muted">{fullName(expense.user)}</td>
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
                      {isMileageExpense(expense) ? (
                        <span className="text-xs text-muted">—</span>
                      ) : (
                        <AiConfidenceBadge value={expense.aiConfidence} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={expense.status} />
                    </td>
                    {showApproveCol && (
                      <td className="px-4 py-3">
                        {rowApprove ? (
                          <QuickApproveButton expenseId={expense.id} />
                        ) : ownPending ? (
                          <span className="text-xs font-semibold text-amber-800">Solo COO</span>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

