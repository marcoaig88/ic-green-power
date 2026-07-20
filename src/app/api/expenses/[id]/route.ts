import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteUpload } from "@/lib/files";
import {
  canAccessExpense,
  canApproveExpense,
  isAdminIt,
  isManager,
} from "@/lib/roles";
import {
  duplicateExpenseMessage,
  findDuplicateExpense,
  normalizeTaxId,
} from "@/lib/expense-duplicates";

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

async function getAccessibleExpense(id: string, actor: { id: string; role: string }) {
  const expense = await prisma.expense.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, surname: true, email: true, role: true } },
    },
  });
  if (!expense) return null;
  if (!canAccessExpense(actor, { userId: expense.userId, user: expense.user })) {
    return null;
  }
  return expense;
}

export async function GET(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { id } = await params;
  const expense = await getAccessibleExpense(id, user);
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
  const existing = await getAccessibleExpense(id, user);
  if (!existing) {
    return NextResponse.json({ error: "Nota spesa non trovata" }, { status: 404 });
  }

  try {
    const body = updateSchema.parse(await request.json());
    const canApprove = canApproveExpense(user, {
      userId: existing.userId,
      user: existing.user,
    });

    if (body.status && (body.status === "approved" || body.status === "rejected")) {
      if (!canApprove) {
        return NextResponse.json(
          {
            error: isAdminIt(user.role)
              ? "Admin IT non può approvare le note spese"
              : isManager(user.role)
                ? "Non puoi approvare questa nota spesa"
                : "Solo COO o CFO possono approvare/rifiutare",
          },
          { status: 403 },
        );
      }
    }

    // Dipendente: dopo l'invio non può più modificare i campi
    if (existing.status !== "draft" && !canApprove) {
      return NextResponse.json(
        { error: "Non puoi modificare una nota spesa già inserita" },
        { status: 403 },
      );
    }

    const nextTaxId =
      body.taxId !== undefined
        ? normalizeTaxId(body.taxId) || null
        : normalizeTaxId(existing.taxId) || null;
    const nextAmount =
      body.amount !== undefined ? body.amount : existing.amount;
    const nextDate =
      body.expenseDate !== undefined
        ? body.expenseDate
          ? new Date(
              body.expenseDate.includes("T")
                ? body.expenseDate
                : `${body.expenseDate}T12:00:00.000Z`,
            )
          : null
        : existing.expenseDate;

    const duplicate = await findDuplicateExpense({
      taxId: nextTaxId,
      amount: nextAmount,
      expenseDate: nextDate,
      excludeId: id,
    });
    if (duplicate) {
      return NextResponse.json(
        {
          error: duplicateExpenseMessage(duplicate),
          duplicate,
        },
        { status: 409 },
      );
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
              ? new Date(
                  body.expenseDate.includes("T")
                    ? body.expenseDate
                    : `${body.expenseDate}T12:00:00.000Z`,
                )
              : null,
        vatAmount: body.vatAmount,
        vatRate: body.vatRate,
        category: body.category,
        description: body.description,
        documentNumber: body.documentNumber,
        taxId: body.taxId !== undefined ? nextTaxId : undefined,
        km: body.km,
        ratePerKm: body.ratePerKm,
        routeFrom: body.routeFrom,
        routeTo: body.routeTo,
        status: body.status,
      },
      include: {
        user: { select: { id: true, name: true, surname: true, email: true, role: true } },
      },
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
  const existing = await getAccessibleExpense(id, user);
  if (!existing) {
    return NextResponse.json({ error: "Nota spesa non trovata" }, { status: 404 });
  }

  const isOwner = existing.userId === user.id;

  // Solo il proprietario può annullare la propria nota spesa
  if (!isOwner) {
    return NextResponse.json(
      { error: "Puoi annullare solo le tue note spese" },
      { status: 403 },
    );
  }

  if (existing.status === "approved") {
    return NextResponse.json(
      { error: "Non puoi annullare una nota spesa già approvata" },
      { status: 400 },
    );
  }

  await deleteUpload(existing.filePath);
  await prisma.expense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
