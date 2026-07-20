import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STATUS_LABELS, formatMoney } from "@/lib/format";
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
import { fullName } from "@/lib/user";
import {
  ROLES,
  canApproveExpense,
  isCfo,
  isCoo,
  isCfoOwnPending,
  teamUsersWhere,
} from "@/lib/roles";

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

  const actor = { id: user.id, role: user.role };
  const filters = parseExpenseFilters(await searchParams);
  const where = buildExpenseWhere(filters, {
    role: user.role,
    sessionUserId: user.id,
    scope: "dashboard",
  });
  const monthStart = startOfMonth();
  const filtered = hasActiveExpenseFilters(filters);

  const teamWhere = isCoo(user.role)
    ? { role: ROLES.cfo }
    : teamUsersWhere;

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
        user: { select: { id: true, name: true, surname: true, role: true } },
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
        category: true,
        km: true,
        status: true,
        userId: true,
        user: { select: { name: true, surname: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: teamWhere,
      select: { id: true, name: true, surname: true, email: true, role: true },
      orderBy: [{ surname: "asc" }, { name: "asc" }],
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

  const byMonth = buildMonthSeries(allExpenses);
  const monthApproved = sumAmounts(
    monthExpenses.filter((e) => e.status === "approved"),
  );
  const monthAll = sumAmounts(monthExpenses);

  const pendingApprovable = pending.filter((e) =>
    canApproveExpense(actor, { userId: e.userId, user: e.user }),
  );
  const pendingOwnCfo = isCfo(user.role)
    ? pending.filter((e) => isCfoOwnPending(actor, e))
    : [];

  const pendingCount = pendingApprovable.length;
  const pendingTotal = sumAmounts(pendingApprovable);
  const filteredTotal = sumAmounts(allExpenses);

  const monthLabel = new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  const exportParams = expenseFiltersToSearchParams(filters).toString();
  const exportHref = exportParams
    ? `/api/expenses/export?${exportParams}`
    : "/api/expenses/export";
  const pendingListParams = expenseFiltersToSearchParams({
    ...filters,
    status: "submitted",
  }).toString();
  const pendingListHref = `/expenses?${pendingListParams}`;

  const subtitle = isCoo(user.role)
    ? filtered
      ? `Vista CFO filtrata · ${allExpenses.length} spese · ${formatMoney(filteredTotal)}`
      : `Solo note spese del CFO · ${monthLabel}`
    : filtered
      ? `Vista filtrata · ${allExpenses.length} spese · ${formatMoney(filteredTotal)}`
      : `Panoramica note spese · ${monthLabel}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="brand-title brand-title--ink text-3xl sm:text-4xl">Dashboard</h1>
          <p className="brand-subtitle brand-subtitle--ink mt-1 text-sm">{subtitle}</p>
        </div>
        <a
          href={exportHref}
          className="rounded-md border border-line bg-white/80 px-4 py-2 text-sm font-semibold text-ink hover:border-brand"
        >
          Esporta CSV
        </a>
      </div>

      <ExpenseFilters
        isAdmin
        users={team.map((member) => ({ id: member.id, name: fullName(member) }))}
        resultCount={allExpenses.length}
        values={filters}
        basePath="/admin"
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Kpi
          label={filtered ? "Totale filtrato" : "Totale mese"}
          value={formatMoney(filtered ? filteredTotal : monthAll)}
          hint={
            filtered
              ? `${allExpenses.length} spese selezionate`
              : isCoo(user.role)
                ? "Spese del CFO nel mese"
                : "Tutte le spese del mese"
          }
        />
        <Kpi
          label="Approvato nel mese"
          value={formatMoney(monthApproved)}
          hint="Solo spese approvate"
        />
        <Kpi
          label="Da approvare"
          value={String(pendingCount)}
          hint={formatMoney(pendingTotal)}
          accent
        />
      </section>

      <section className="rounded-xl border border-line bg-white/80 p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-brand-deep">
              {isCoo(user.role) ? "Da approvare (CFO)" : "Da approvare"}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              {pendingCount === 0
                ? "Nessuna spesa in attesa"
                : `${pendingCount} · ${formatMoney(pendingTotal)}`}
            </p>
          </div>
          <Link
            href={pendingListHref}
            className="text-sm font-semibold text-brand hover:text-brand-deep"
          >
            Vedi in lista →
          </Link>
        </div>
        <PendingApprovals
          expenses={pendingApprovable.map((expense) => ({
            ...expense,
            user: { name: fullName(expense.user) },
            canApprove: true,
          }))}
          emptyMessage={
            isCoo(user.role)
              ? "Nessuna spesa del CFO in attesa."
              : "Nessuna spesa in attesa. Ottimo lavoro."
          }
        />
      </section>

      {pendingOwnCfo.length > 0 && (
        <section className="rounded-xl border border-amber-300/80 bg-amber-50/80 p-5">
          <div className="mb-4">
            <h2 className="font-display text-lg font-bold text-amber-950">
              Le tue spese (in attesa del COO)
            </h2>
            <p className="mt-0.5 text-xs text-amber-900/80">
              Non puoi approvare le tue note spese — le gestisce il COO ·{" "}
              {pendingOwnCfo.length} · {formatMoney(sumAmounts(pendingOwnCfo))}
            </p>
          </div>
          <PendingApprovals
            expenses={pendingOwnCfo.map((expense) => ({
              ...expense,
              user: { name: fullName(expense.user) },
              canApprove: false,
              highlight: true,
            }))}
          />
        </section>
      )}

      {!isCoo(user.role) && (
        <DashboardCharts byStatus={byStatus} byMonth={byMonth} />
      )}
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
