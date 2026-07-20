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

/** Conteggio badge nav: solo note su cui l'utente può agire. */
export async function countApprovablePending(actor: SessionActor) {
  if (!canApproveExpenses(actor.role)) return 0;
  const pending = await loadPendingExpenses(actor);
  return splitPendingForActor(actor, pending).approvable.length;
}
