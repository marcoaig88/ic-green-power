import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExpenseForm } from "@/components/ExpenseForm";
import { canAccessExpense, canApproveExpense } from "@/lib/roles";

type Props = {
  searchParams: Promise<{ ids?: string; i?: string }>;
};

export default async function ExpenseReviewPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const ids = (params.ids || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length === 0) redirect("/expenses/new");

  const index = Math.min(
    Math.max(Number.parseInt(params.i || "0", 10) || 0, 0),
    ids.length - 1,
  );
  const currentId = ids[index];

  const expense = await prisma.expense.findUnique({
    where: { id: currentId },
    include: { user: { select: { name: true, role: true } } },
  });

  if (
    !expense ||
    !canAccessExpense(user, { userId: expense.userId, user: expense.user })
  ) {
    const remaining = ids.filter((id) => id !== currentId);
    if (remaining.length === 0) redirect("/expenses");
    redirect(`/expenses/review?ids=${remaining.join(",")}`);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-white/85 px-4 py-3 text-sm backdrop-blur-sm">
        <p className="font-semibold text-brand-deep">
          Conferma scontrini · {index + 1} di {ids.length}
        </p>
        <p className="mt-1 text-muted">
          Controlla e conferma ogni spesa. Alla fine tornerai all&apos;elenco.
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-accent">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${((index + 1) / ids.length) * 100}%` }}
          />
        </div>
      </div>

      <ExpenseForm
        key={expense.id}
        isAdmin={canApproveExpense(user, {
          userId: expense.userId,
          user: expense.user,
        })}
        queue={{ ids, index }}
        expense={{
          id: expense.id,
          merchant: expense.merchant,
          amount: expense.amount,
          currency: expense.currency,
          expenseDate: expense.expenseDate?.toISOString() ?? null,
          vatAmount: expense.vatAmount,
          vatRate: expense.vatRate,
          category: expense.category,
          description: expense.description,
          documentNumber: expense.documentNumber,
          taxId: expense.taxId,
          km: expense.km,
          ratePerKm: expense.ratePerKm,
          routeFrom: expense.routeFrom,
          routeTo: expense.routeTo,
          status: expense.status,
          fileName: expense.fileName,
          fileMimeType: expense.fileMimeType,
          filePath: expense.filePath,
          aiConfidence: expense.aiConfidence,
          user: expense.user,
        }}
      />
    </div>
  );
}
