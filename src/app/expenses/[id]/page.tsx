import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExpenseForm } from "@/components/ExpenseForm";
import {
  canAccessExpense,
  canApproveExpense,
  homePathForRole,
} from "@/lib/roles";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aiError?: string }>;
};

export default async function ExpenseDetailPage({ params, searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const { aiError } = await searchParams;
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { user: { select: { name: true, role: true } } },
  });

  if (!expense) notFound();
  if (!canAccessExpense(user, { userId: expense.userId, user: expense.user })) {
    notFound();
  }

  return (
    <ExpenseForm
      homeHref={homePathForRole(user.role)}
      viewerRole={user.role}
      isOwner={expense.userId === user.id}
      canApprove={canApproveExpense(user, {
        userId: expense.userId,
        user: expense.user,
      })}
      aiError={aiError || null}
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
        aciVehicleRateId: expense.aciVehicleRateId,
        vehicleBrand: expense.vehicleBrand,
        vehicleModel: expense.vehicleModel,
        status: expense.status,
        rejectionReason: expense.rejectionReason,
        fileName: expense.fileName,
        fileMimeType: expense.fileMimeType,
        filePath: expense.filePath,
        aiConfidence: expense.aiConfidence,
        user: expense.user,
      }}
    />
  );
}
