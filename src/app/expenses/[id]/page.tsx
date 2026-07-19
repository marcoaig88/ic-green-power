import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExpenseForm } from "@/components/ExpenseForm";

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
    include: { user: { select: { name: true } } },
  });

  if (!expense) notFound();
  if (user.role !== "admin" && expense.userId !== user.id) notFound();

  return (
    <ExpenseForm
      isAdmin={user.role === "admin"}
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
        status: expense.status,
        fileName: expense.fileName,
        fileMimeType: expense.fileMimeType,
        filePath: expense.filePath,
        aiConfidence: expense.aiConfidence,
        user: expense.user,
      }}
    />
  );
}
