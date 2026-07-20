import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STATUS_LABELS, formatMoney } from "@/lib/format";
import { DashboardCharts } from "@/components/DashboardCharts";
import {
  canApproveExpenses,
  expenseDashboardWhere,
  isCoo,
} from "@/lib/roles";
import {
  loadPendingExpenses,
  splitPendingForActor,
} from "@/lib/pending-approvals";

export const dynamic = "force-dynamic";

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

export default async function AdminDashboardPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const actor = { id: user.id, role: user.role };
  const where = expenseDashboardWhere(actor);
  const monthStart = startOfMonth();

  const [allExpenses, pending] = await Promise.all([
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
    loadPendingExpenses(actor),
  ]);

  const monthExpenses = allExpenses.filter((expense) => {
    const date = expense.expenseDate || expense.createdAt;
    return date >= monthStart;
  });

  const monthSubmittedOrApproved = monthExpenses.filter(
    (e) => e.status === "submitted" || e.status === "approved",
  );

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
  const monthAll = sumAmounts(monthSubmittedOrApproved);

  const { approvable } = splitPendingForActor(actor, pending);
  const showAttivita = canApproveExpenses(user.role);
  const pendingCount = showAttivita ? approvable.length : pending.length;
  const pendingTotal = showAttivita
    ? sumAmounts(approvable)
    : sumAmounts(pending);

  const monthLabel = new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  const subtitle = isCoo(user.role)
    ? `Solo note spese del CFO · ${monthLabel}`
    : `Panoramica note spese · ${monthLabel}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="brand-title brand-title--ink text-3xl sm:text-4xl">Dashboard</h1>
          <p className="brand-subtitle brand-subtitle--ink mt-1 text-sm">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/expenses/export"
            className="rounded-md border border-line bg-white/80 px-4 py-2 text-sm font-semibold text-ink hover:border-brand"
          >
            Esporta CSV
          </a>
          <Link
            href="/expenses"
            className="rounded-md border border-line bg-white/80 px-4 py-2 text-sm font-semibold text-ink hover:border-brand"
          >
            Note spese
          </Link>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {showAttivita ? (
          <Link href="/admin/attivita" className="block transition hover:opacity-90">
            <Kpi
              label="Da approvare"
              value={formatMoney(pendingTotal)}
              hint={
                pendingCount === 0
                  ? "Nessuna nota · vai ad Attività"
                  : `${pendingCount} ${pendingCount === 1 ? "nota" : "note"} · vai ad Attività`
              }
              accent
            />
          </Link>
        ) : (
          <Kpi
            label="In attesa"
            value={formatMoney(pendingTotal)}
            hint={
              pendingCount === 0
                ? "Nessuna nota"
                : `${pendingCount} ${pendingCount === 1 ? "nota" : "note"}`
            }
            accent
          />
        )}
        <Kpi
          label="Approvato nel mese"
          value={formatMoney(monthApproved)}
          hint="Solo spese approvate"
        />
        <Kpi
          label="Totale mese"
          value={formatMoney(monthAll)}
          hint={
            isCoo(user.role)
              ? "CFO · (escluse bozze e rifiutate)"
              : "(escluse bozze e rifiutate)"
          }
        />
      </section>

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
