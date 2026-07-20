import { prisma } from "@/lib/prisma";
import { STATUS_LABELS, formatDateTime } from "@/lib/format";

export type DuplicateExpenseInfo = {
  id: string;
  createdAt: string;
  status: string;
  statusLabel: string;
  createdAtLabel: string;
};

/** Normalizza P.IVA / CF per confrontare duplicati. */
export function normalizeTaxId(taxId: string | null | undefined) {
  if (!taxId) return "";
  return taxId.replace(/[\s.\-/]/g, "").toUpperCase();
}

function dayBoundsUtc(date: Date) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0));
  return { start, end };
}

/**
 * Cerca una nota spesa già presente con stessa P.IVA, importo e data documento.
 * Esclude `excludeId` (utile in update).
 */
export async function findDuplicateExpense(params: {
  taxId: string | null | undefined;
  amount: number | null | undefined;
  expenseDate: Date | string | null | undefined;
  excludeId?: string;
}): Promise<DuplicateExpenseInfo | null> {
  const taxId = normalizeTaxId(params.taxId);
  const amount =
    params.amount == null || !Number.isFinite(params.amount)
      ? null
      : Math.round(params.amount * 100) / 100;
  const rawDate =
    typeof params.expenseDate === "string"
      ? new Date(params.expenseDate.includes("T") ? params.expenseDate : `${params.expenseDate}T12:00:00.000Z`)
      : params.expenseDate;

  if (!taxId || amount == null || !rawDate || Number.isNaN(rawDate.getTime())) {
    return null;
  }

  const { start, end } = dayBoundsUtc(rawDate);
  const candidates = await prisma.expense.findMany({
    where: {
      expenseDate: { gte: start, lt: end },
      amount: { gte: amount - 0.005, lte: amount + 0.005 },
      taxId: { not: null },
      ...(params.excludeId ? { NOT: { id: params.excludeId } } : {}),
    },
    select: {
      id: true,
      taxId: true,
      createdAt: true,
      status: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const match = candidates.find((row) => normalizeTaxId(row.taxId) === taxId);
  if (!match) return null;

  return {
    id: match.id,
    createdAt: match.createdAt.toISOString(),
    status: match.status,
    statusLabel: STATUS_LABELS[match.status] || match.status,
    createdAtLabel: formatDateTime(match.createdAt),
  };
}

export function duplicateExpenseMessage(dup: DuplicateExpenseInfo) {
  return `Esiste già una nota spesa con la stessa P.IVA/CF, importo e data (inserita il ${dup.createdAtLabel}, stato: ${dup.statusLabel}).`;
}
