import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteUpload } from "@/lib/files";
import { canApproveExpenses, canViewAllExpenses } from "@/lib/roles";

const updateSchema = z.object({
  merchant: z.string().nullable().optional(),
  amount: z.number().nullable().optional(),
  currency: z.string().optional(),
  expenseDate: z.string().nullable().optional(),
  vatAmount: z.number().nullable().optional(),
  vatRate: z.number().nullable().optional(),
  category: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  documentNumber: z.string().nullable().optional(),
  taxId: z.string().nullable().optional(),
  km: z.number().nullable().optional(),
  ratePerKm: z.number().nullable().optional(),
  routeFrom: z.string().nullable().optional(),
  routeTo: z.string().nullable().optional(),
  status: z.enum(["draft", "submitted", "approved", "rejected"]).optional(),
});

type Params = { params: Promise<{ id: string }> };

async function getAccessibleExpense(id: string, userId: string, role: string) {
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!expense) return null;
  if (!canViewAllExpenses(role) && expense.userId !== userId) return null;
  return expense;
}

export async function GET(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { id } = await params;
  const expense = await getAccessibleExpense(id, user.id, user.role);
  if (!expense) {
    return NextResponse.json({ error: "Nota spesa non trovata" }, { status: 404 });
  }

  return NextResponse.json({ expense });
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getAccessibleExpense(id, user.id, user.role);
  if (!existing) {
    return NextResponse.json({ error: "Nota spesa non trovata" }, { status: 404 });
  }

  try {
    const body = updateSchema.parse(await request.json());

    if (
      body.status &&
      (body.status === "approved" || body.status === "rejected") &&
      !canApproveExpenses(user.role)
    ) {
      return NextResponse.json({ error: "Solo responsabile/Admin IT può approvare/rifiutare" }, { status: 403 });
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        merchant: body.merchant,
        amount: body.amount,
        currency: body.currency,
        expenseDate:
          body.expenseDate === undefined
            ? undefined
            : body.expenseDate
              ? new Date(body.expenseDate)
              : null,
        vatAmount: body.vatAmount,
        vatRate: body.vatRate,
        category: body.category,
        description: body.description,
        documentNumber: body.documentNumber,
        taxId: body.taxId,
        km: body.km,
        ratePerKm: body.ratePerKm,
        routeFrom: body.routeFrom,
        routeTo: body.routeTo,
        status: body.status,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json({ expense });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dati non validi", details: error.flatten() }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Errore aggiornamento" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await getAccessibleExpense(id, user.id, user.role);
  if (!existing) {
    return NextResponse.json({ error: "Nota spesa non trovata" }, { status: 404 });
  }

  if (existing.status !== "draft" && !canViewAllExpenses(user.role)) {
    return NextResponse.json({ error: "Puoi eliminare solo le bozze" }, { status: 400 });
  }

  await deleteUpload(existing.filePath);
  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
