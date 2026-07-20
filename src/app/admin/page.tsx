import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CATEGORY_LABELS, formatMoney } from "@/lib/format";
import { DashboardCharts } from "@/components/DashboardCharts";
import {
  canAccessDashboard,
  canApproveExpenses,
  expenseDashboardWhere,
  isCfo,
} from "@/lib/roles";
import {
  loadPendingExpenses,
  pendingForDaApprovareKpi,
} from "@/lib/pending-approvals";

export const dynamic = "force-dynamic";

function startOfMonth(d = new Date()) {
  const rome = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const [y, m] = rome.split("-").map(Number);
  return new Date(`${y}-${String(m).padStart(2, "0")}-01T00:00:00+02:00`);
}

function sumAmounts(rows: { amount: number | null }[]) {
  return rows.reduce((acc, row) => acc + (row.amount || 0), 0);
}

function monthKey(date: Date) {
  const rome = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
  }).format(date);
  return rome.slice(0, 7);
}

function monthKeysBack(monthsBack = 6) {
  const romeNow = monthKey(new Date());
  const [y0, m0] = romeNow.split("-").map(Number);
  const keys: string[] = [];
  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    let y = y0;
    let m = m0 - i;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    keys.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return keys;
}

function categoryLabel(category: string | null) {
  if (!category) return "Senza categoria";
  return CATEGORY_LABELS[category] || category;
}

/** Top N categorie (periodo) + serie mensile per ciascuna. Solo inviate/approvate. */
function buildMonthCategorySeries(
  expenses: {
    amount: number | null;
    category: string | null;
    status: string;
    createdAt: Date;
  }[],
  monthsBack = 6,
  topN = 4,
) {
  const keys = monthKeysBack(monthsBack);
  const eligible = expenses.filter(
    (e) => e.status === "submitted" || e.status === "approved",
  );

  const periodTotals = new Map<string, number>();
  for (const expense of eligible) {
    const mk = monthKey(expense.createdAt);
    if (!keys.includes(mk)) continue;
    const label = categoryLabel(expense.category);
    periodTotals.set(label, (periodTotals.get(label) || 0) + (expense.amount || 0));
  }

  const categoryKeys = [...periodTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([label]) => label);

  const formatter = new Intl.DateTimeFormat("it-IT", {
    month: "short",
    year: "2-digit",
    timeZone: "Europe/Rome",
  });

  const byMonthCategory = keys.map((key) => {
    const [y, m] = key.split("-").map(Number);
    const row: Record<string, string | number> = {
      label: formatter.format(new Date(Date.UTC(y, m - 1, 15))),
    };
    for (const cat of categoryKeys) row[cat] = 0;
    return row;
  });

  const indexByKey = new Map(keys.map((key, i) => [key, i]));

  for (const expense of eligible) {
    const mk = monthKey(expense.createdAt);
    const idx = indexByKey.get(mk);
    if (idx == null) continue;
    const label = categoryLabel(expense.category);
    if (!categoryKeys.includes(label)) continue;
    const row = byMonthCategory[idx];
    row[label] = Number(row[label] || 0) + (expense.amount || 0);
  }

  return { byMonthCategory, categoryKeys };
}

export default async function AdminDashboardPage() {
  const user = await getSessionUser();
  if (!user) return null;
  if (!canAccessDashboard(user.role)) redirect("/admin/attivita");

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

  const monthExpenses = allExpenses.filter(
    (expense) => expense.createdAt >= monthStart,
  );

  const monthSubmittedOrApproved = monthExpenses.filter(
    (e) => e.status === "submitted" || e.status === "approved",
  );

  const { byMonthCategory, categoryKeys } = buildMonthCategorySeries(allExpenses);
  const monthApproved = sumAmounts(
    monthExpenses.filter((e) => e.status === "approved"),
  );
  const monthAll = sumAmounts(monthSubmittedOrApproved);

  const showAttivita = canApproveExpenses(user.role);
  const daApprovare = showAttivita
    ? pendingForDaApprovareKpi(actor, pending)
    : pending;
  const pendingCount = daApprovare.length;
  const pendingTotal = sumAmounts(daApprovare);

  const monthLabel = new Intl.DateTimeFormat("it-IT", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  const subtitle = `Panoramica note spese · ${monthLabel}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="brand-title brand-title--ink text-3xl sm:text-4xl">Dashboard</h1>
          <p className="brand-subtitle brand-subtitle--ink mt-1 text-sm">{subtitle}</p>
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
                  : isCfo(user.role)
                    ? `${pendingCount} ${pendingCount === 1 ? "nota" : "note"} (incl. tue) · Attività`
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
          hint="Approvate · data caricamento"
        />
        <Kpi
          label="Totale mese"
          value={formatMoney(monthAll)}
          hint="Data caricamento (escl. bozze e rifiutate)"
        />
      </section>

      <DashboardCharts
        byMonthCategory={byMonthCategory}
        categoryKeys={categoryKeys}
      />
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
