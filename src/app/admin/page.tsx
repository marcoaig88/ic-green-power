import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  formatDate,
  formatMoney,
} from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

function startOfMonth(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function sumAmounts(rows: { amount: number | null }[]) {
  return rows.reduce((acc, row) => acc + (row.amount || 0), 0);
}

export default async function AdminDashboardPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const monthStart = startOfMonth();

  const [allExpenses, pending, team] = await Promise.all([
    prisma.expense.findMany({
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
      where: { status: "submitted" },
      include: { user: { select: { name: true } } },
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

  const monthApproved = sumAmounts(
    monthExpenses.filter((e) => e.status === "approved"),
  );
  const monthAll = sumAmounts(monthExpenses);
  const pendingCount = byStatus.find((s) => s.status === "submitted")?.count || 0;
  const pendingTotal = byStatus.find((s) => s.status === "submitted")?.total || 0;
  const maxCategory = Math.max(...byCategory.map((c) => c.total), 1);
  const maxStatus = Math.max(...byStatus.map((s) => s.count), 1);

  const monthLabel = new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="brand-title brand-title--ink text-3xl sm:text-4xl">Dashboard</h1>
          <p className="brand-subtitle brand-subtitle--ink mt-1 text-sm">
            Panoramica note spese · {monthLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/expenses?status=submitted"
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
          >
            Da approvare ({pendingCount})
          </Link>
          <Link
            href="/expenses"
            className="rounded-md border border-line bg-white/80 px-4 py-2 text-sm font-semibold text-ink hover:border-brand"
          >
            Tutte le spese
          </Link>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Totale mese" value={formatMoney(monthAll)} hint="Tutte le spese del mese" />
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
          hint={`${allExpenses.length} spese totali`}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-white/80 p-5">
          <h2 className="font-display text-lg font-bold text-brand-deep">Per stato</h2>
          <ul className="mt-4 space-y-3">
            {byStatus.map((row) => (
              <li key={row.status}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <Link
                    href={`/expenses?status=${row.status}`}
                    className="font-semibold text-ink hover:text-brand"
                  >
                    {row.label}
                  </Link>
                  <span className="text-muted">
                    {row.count} · {formatMoney(row.total)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-bg-accent">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${(row.count / maxStatus) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-line bg-white/80 p-5">
          <h2 className="font-display text-lg font-bold text-brand-deep">Per categoria</h2>
          {byCategory.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nessun dato ancora.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {byCategory.map((row) => (
                <li key={row.key}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <Link
                      href={`/expenses?category=${row.key}`}
                      className="font-semibold text-ink hover:text-brand"
                    >
                      {row.label}
                    </Link>
                    <span className="text-muted">
                      {row.count} · {formatMoney(row.total)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-bg-accent">
                    <div
                      className="h-full rounded-full bg-brand-deep/80"
                      style={{ width: `${(row.total / maxCategory) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-line bg-white/80 p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-brand-deep">Per dipendente</h2>
          <p className="text-xs text-muted">Totali complessivi e del mese corrente</p>
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
        {pending.length === 0 ? (
          <p className="text-sm text-muted">Nessuna spesa in attesa. Ottimo lavoro.</p>
        ) : (
          <ul className="divide-y divide-line/70">
            {pending.map((expense) => (
              <li
                key={expense.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <Link
                    href={`/expenses/${expense.id}`}
                    className="font-semibold text-ink hover:text-brand"
                  >
                    {expense.merchant || "Da completare"}
                  </Link>
                  <p className="text-xs text-muted">
                    {expense.user.name} · {formatDate(expense.expenseDate || expense.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">
                    {formatMoney(expense.amount, expense.currency)}
                  </span>
                  <StatusBadge status={expense.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
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
