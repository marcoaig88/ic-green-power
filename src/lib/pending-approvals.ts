import { prisma } from "@/lib/prisma";
import {
  canApproveExpense,
  canApproveExpenses,
  expenseDashboardWhere,
  isCfo,
  isCfoOwnPending,
} from "@/lib/roles";

type SessionActor = { id: string; role: string };

const pendingSelect = {
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
} as const;

/** Note spese submitted complete nello scope dashboard dell'attore. */
export async function loadPendingExpenses(actor: SessionActor) {
  const where = expenseDashboardWhere(actor);
  return prisma.expense.findMany({
    where: {
      AND: [
        where,
        { status: "submitted" },
        { merchant: { not: null } },
        { amount: { not: null } },
      ],
    },
    select: pendingSelect,
    orderBy: { createdAt: "desc" },
  });
}

export function splitPendingForActor(
  actor: SessionActor,
  pending: Awaited<ReturnType<typeof loadPendingExpenses>>,
) {
  const approvable = pending.filter((e) =>
    canApproveExpense(actor, { userId: e.userId, user: e.user }),
  );
  const ownCfo = isCfo(actor.role)
    ? pending.filter((e) => isCfoOwnPending(actor, e))
    : [];
  return { approvable, ownCfo };
}

/**
 * KPI / badge «Da approvare»:
 * - CFO → note altrui da approvare + proprie in attesa del COO
 * - COO → solo note del CFO da approvare
 */
export function pendingForDaApprovareKpi(
  actor: SessionActor,
  pending: Awaited<ReturnType<typeof loadPendingExpenses>>,
) {
  const { approvable, ownCfo } = splitPendingForActor(actor, pending);
  return isCfo(actor.role) ? [...approvable, ...ownCfo] : approvable;
}

/** Conteggio badge nav Attività. */
export async function countApprovablePending(actor: SessionActor) {
  if (!canApproveExpenses(actor.role)) return 0;
  const pending = await loadPendingExpenses(actor);
  return pendingForDaApprovareKpi(actor, pending).length;
}
