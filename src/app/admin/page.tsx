import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  formatMoney,
} from "@/lib/format";
import {
  buildExpenseWhere,
  expenseFiltersToSearchParams,
  hasActiveExpenseFilters,
  parseExpenseFilters,
  type ExpenseFilterParams,
} from "@/lib/expense-filters";
import { ExpenseFilters } from "@/components/ExpenseFilters";
import { DashboardCharts } from "@/components/DashboardCharts";
import { PendingApprovals } from "@/components/PendingApprovals";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<ExpenseFilterParams>;
};

function startOfMonth(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function sumAmounts(rows: { amount: number | null }[]) {
  return rows.reduce((acc, row) => acc + (row.amount || 0), 0);
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildMonthSeries(
  expenses: { amount: number | null; expenseDate: Date | null; createdAt: Date }[],
  monthsBack = 6,
) {
  const now = new Date();
  const keys: string[] = [];
  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(monthKey(d));
  }

  const totals = new Map(keys.map((key) => [key, { total: 0, count: 0 }]));
  for (const expense of expenses) {
    const date = expense.expenseDate || expense.createdAt;
    const key = monthKey(date);
    const bucket = totals.get(key);
    if (!bucket) continue;
    bucket.total += expense.amount || 0;
    bucket.count += 1;
  }

  const formatter = new Intl.DateTimeFormat("it-IT", { month: "short", year: "2-digit" });
  return keys.map((key) => {
    const [y, m] = key.split("-").map(Number);
    const label = formatter.format(new Date(Date.UTC(y, m - 1, 1)));
    const bucket = totals.get(key)!;
    return { label, total: bucket.total, count: bucket.count };
  });
}

export default async function AdminDashboardPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) return null;

  const filters = parseExpenseFilters(await searchParams);
  const where = buildExpenseWhere(filters, {
    role: user.role,
    sessionUserId: user.id,
  });
  const monthStart = startOfMonth();
  const filtered = hasActiveExpenseFilters(filters);

  const [allExpenses, pending, team] = await Promise.all([
    prisma.expense.findMany({
      where,
      select: {
        id: true,
        status: true,
        category: true,
        amount: true,
        currency: true,
        merchant: true,
        expenseDate: true,
        createdAt: true,
        userId: true,
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.expense.findMany({
      where: {
        AND: [where, { status: "submitted" }],
      },
      select: {
        id: true,
        merchant: true,
        amount: true,
        currency: true,
        expenseDate: true,
        createdAt: true,
        aiConfidence: true,
        status: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.user.findMany({
      where: { role: "employee" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const monthExpenses = allExpenses.filter((expense) => {
    const date = expense.expenseDate || expense.createdAt;
    return date >= monthStart;
  });

  const byStatus = Object.keys(STATUS_LABELS).map((status) => {
    const rows = allExpenses.filter((e) => e.status === status);
    return {
      status,
      label: STATUS_LABELS[status],
      count: rows.length,
      total: sumAmounts(rows),
    };
  });

  const byCategoryMap = new Map<string, { count: number; total: number }>();
  for (const expense of allExpenses) {
    const key = expense.category || "altro";
    const prev = byCategoryMap.get(key) || { count: 0, total: 0 };
    byCategoryMap.set(key, {
      count: prev.count + 1,
      total: prev.total + (expense.amount || 0),
    });
  }
  const byCategory = [...byCategoryMap.entries()]
    .map(([key, value]) => ({
      key,
      label: CATEGORY_LABELS[key] || key,
      ...value,
    }))
    .sort((a, b) => b.total - a.total);

  const byEmployee = team.map((member) => {
    const rows = allExpenses.filter((e) => e.userId === member.id);
    const memberMonth = monthExpenses.filter((e) => e.userId === member.id);
    return {
      ...member,
      count: rows.length,
      total: sumAmounts(rows),
      monthTotal: sumAmounts(memberMonth),
      pending: rows.filter((e) => e.status === "submitted").length,
    };
  });

  const byMonth = buildMonthSeries(allExpenses);
  const monthApproved = sumAmounts(
    monthExpenses.filter((e) => e.status === "approved"),
  );
  const monthAll = sumAmounts(monthExpenses);
  const pendingCount = byStatus.find((s) => s.status === "submitted")?.count || 0;
  const pendingTotal = byStatus.find((s) => s.status === "submitted")?.total || 0;
  const filteredTotal = sumAmounts(allExpenses);

  const monthLabel = new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  const exportParams = expenseFiltersToSearchParams(filters).toString();
  const exportHref = exportParams
    ? `/api/expenses/export?${exportParams}`
    : "/api/expenses/export";
  const expensesListHref = exportParams ? `/expenses?${exportParams}` : "/expenses";
  const pendingListParams = expenseFiltersToSearchParams({
    ...filters,
    status: "submitted",
  }).toString();
  const pendingListHref = `/expenses?${pendingListParams}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="brand-title brand-title--ink text-3xl sm:text-4xl">Dashboard</h1>
          <p className="brand-subtitle brand-subtitle--ink mt-1 text-sm">
            {filtered
              ? `Vista filtrata · ${allExpenses.length} spese · ${formatMoney(filteredTotal)}`
              : `Panoramica note spese · ${monthLabel}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={exportHref}
            className="rounded-md border border-line bg-white/80 px-4 py-2 text-sm font-semibold text-ink hover:border-brand"
          >
            Esporta CSV
          </a>
          <Link
            href={pendingListHref}
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
          >
            Da approvare ({pendingCount})
          </Link>
          <Link
            href={expensesListHref}
            className="rounded-md border border-line bg-white/80 px-4 py-2 text-sm font-semibold text-ink hover:border-brand"
          >
            Tutte le spese
          </Link>
        </div>
      </div>

      <ExpenseFilters
        isAdmin
        users={team.map((member) => ({ id: member.id, name: member.name }))}
        resultCount={allExpenses.length}
        values={filters}
        basePath="/admin"
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label={filtered ? "Totale filtrato" : "Totale mese"}
          value={formatMoney(filtered ? filteredTotal : monthAll)}
          hint={
            filtered
              ? `${allExpenses.length} spese selezionate`
              : "Tutte le spese del mese"
          }
        />
        <Kpi
          label="Approvato nel mese"
          value={formatMoney(monthApproved)}
          hint="Solo spese approvate"
        />
        <Kpi
          label="In attesa"
          value={String(pendingCount)}
          hint={formatMoney(pendingTotal)}
          accent
        />
        <Kpi
          label="Dipendenti"
          value={String(team.length)}
          hint={`${allExpenses.length} spese in vista`}
        />
      </section>

      <DashboardCharts
        byStatus={byStatus}
        byCategory={byCategory}
        byEmployee={byEmployee}
        byMonth={byMonth}
      />

      <section className="rounded-xl border border-line bg-white/80 p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-brand-deep">Per dipendente</h2>
          <p className="text-xs text-muted">
            {filtered ? "Totali sul filtro attivo" : "Totali complessivi e del mese corrente"}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-2 py-2 font-medium">Dipendente</th>
                <th className="px-2 py-2 font-medium">Spese</th>
                <th className="px-2 py-2 font-medium">In attesa</th>
                <th className="px-2 py-2 font-medium">Totale</th>
                <th className="px-2 py-2 font-medium">Mese</th>
              </tr>
            </thead>
            <tbody>
              {byEmployee.map((member) => (
                <tr key={member.id} className="border-b border-line/70 last:border-0">
                  <td className="px-2 py-3">
                    <Link
                      href={`/expenses?userId=${member.id}`}
                      className="font-semibold hover:text-brand"
                    >
                      {member.name}
                    </Link>
                    <p className="text-xs text-muted">{member.email}</p>
                  </td>
                  <td className="px-2 py-3 text-muted">{member.count}</td>
                  <td className="px-2 py-3">
                    {member.pending > 0 ? (
                      <Link
                        href={`/expenses?userId=${member.id}&status=submitted`}
                        className="font-semibold text-brand"
                      >
                        {member.pending}
                      </Link>
                    ) : (
                      <span className="text-muted">0</span>
                    )}
                  </td>
                  <td className="px-2 py-3 font-medium">{formatMoney(member.total)}</td>
                  <td className="px-2 py-3 text-muted">{formatMoney(member.monthTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-white/80 p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-brand-deep">
            In attesa di approvazione
          </h2>
          <Link
            href="/expenses?status=submitted"
            className="text-sm font-semibold text-brand hover:text-brand-deep"
          >
            Vedi tutte →
          </Link>
        </div>
        <PendingApprovals expenses={pending} />
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-4 ${
        accent ? "border-brand/40 bg-brand-soft/70" : "border-line bg-white/80"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-brand-deep">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}
