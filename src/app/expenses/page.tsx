import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney, CATEGORY_LABELS, dayRangeFromInputs } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { ExpenseFilters } from "@/components/ExpenseFilters";

type Props = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    category?: string;
    userId?: string;
    from?: string;
    to?: string;
  }>;
};

const STATUSES = new Set(["draft", "submitted", "approved", "rejected"]);
const CATEGORIES = new Set(Object.keys(CATEGORY_LABELS));

export default async function ExpensesPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) return null;

  const params = await searchParams;
  const q = (params.q || "").trim();
  const status = STATUSES.has(params.status || "") ? params.status! : "";
  const category = CATEGORIES.has(params.category || "") ? params.category! : "";
  const userId = params.userId || "";
  const from = params.from || "";
  const to = params.to || "";

  const andFilters: Prisma.ExpenseWhereInput[] = [];

  if (user.role !== "admin") {
    andFilters.push({ userId: user.id });
  } else if (userId) {
    andFilters.push({ userId });
  }

  if (status) andFilters.push({ status });
  if (category) andFilters.push({ category });

  if (q) {
    andFilters.push({
      OR: [
        { merchant: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { documentNumber: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (from || to) {
    const range = dayRangeFromInputs(from, to);
    andFilters.push({
      OR: [
        { expenseDate: range },
        {
          AND: [{ expenseDate: null }, { createdAt: range }],
        },
      ],
    });
  }

  const finalWhere: Prisma.ExpenseWhereInput =
    andFilters.length > 0 ? { AND: andFilters } : {};

  const [expenses, teamUsers] = await Promise.all([
    prisma.expense.findMany({
      where: finalWhere,
      include: { user: { select: { name: true } } },
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
    }),
    user.role === "admin"
      ? prisma.user.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

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

      <ExpenseFilters
        isAdmin={user.role === "admin"}
        users={teamUsers}
        resultCount={expenses.length}
        values={{ q, status, category, userId, from, to }}
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
