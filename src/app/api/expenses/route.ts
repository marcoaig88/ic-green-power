import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/files";
import {
  extractReceiptFromFile,
  normalizeConfidence,
} from "@/lib/extract-receipt";
import {
  DEFAULT_MILEAGE_RATE,
  calcMileageAmount,
  mileageMerchant,
} from "@/lib/mileage";
import { canViewAllExpenses } from "@/lib/roles";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const expenses = await prisma.expense.findMany({
    where: canViewAllExpenses(user.role) ? undefined : { userId: user.id },
    include: {
      user: { select: { id: true, name: true, surname: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ expenses });
}

const mileageSchema = z.object({
  type: z.literal("mileage"),
  expenseDate: z.string().min(1),
  routeFrom: z.string().min(1),
  routeTo: z.string().min(1),
  km: z.number().positive(),
  ratePerKm: z.number().positive().optional(),
  description: z.string().nullable().optional(),
  submit: z.boolean().optional(),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      return await createMileageExpense(user.id, await request.json());
    }

    return await createReceiptExpense(user.id, await request.formData());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Dati non validi", details: error.flatten() },
        { status: 400 },
      );
    }
    console.error(error);
    const message = error instanceof Error ? error.message : "Errore durante il caricamento";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function createMileageExpense(userId: string, raw: unknown) {
  const body = mileageSchema.parse(raw);

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      aciVehicleRateId: true,
      aciVehicleRate: {
        select: { id: true, brand: true, model: true, ratePerKm: true },
      },
    },
  });

  const ratePerKm = dbUser?.aciVehicleRate?.ratePerKm ?? DEFAULT_MILEAGE_RATE;
  const amount = calcMileageAmount(body.km, ratePerKm);
  if (amount == null || amount <= 0) {
    return NextResponse.json({ error: "Chilometri o tariffa non validi" }, { status: 400 });
  }

  const expense = await prisma.expense.create({
    data: {
      userId,
      merchant: mileageMerchant(body.routeFrom, body.routeTo),
      amount,
      currency: "EUR",
      expenseDate: new Date(`${body.expenseDate}T12:00:00.000Z`),
      category: "chilometrico",
      description: body.description?.trim() || null,
      km: body.km,
      ratePerKm,
      routeFrom: body.routeFrom.trim(),
      routeTo: body.routeTo.trim(),
      aciVehicleRateId: dbUser?.aciVehicleRateId || null,
      vehicleBrand: dbUser?.aciVehicleRate?.brand || null,
      vehicleModel: dbUser?.aciVehicleRate?.model || null,
      status: body.submit ? "submitted" : "draft",
    },
  });

  return NextResponse.json({ expense });
}

async function createReceiptExpense(userId: string, form: FormData) {
  const file = form.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Carica una foto o un PDF" }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File troppo grande (max 10MB)" }, { status: 400 });
  }

  const saved = await saveUpload(file);

  let extraction = null;
  let aiError: string | null = null;

  try {
    extraction = await extractReceiptFromFile({
      buffer: saved.buffer,
      mimeType: saved.mimeType,
      fileName: saved.originalName,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Estrazione AI non riuscita";
    try {
      const match = message.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as { error?: { message?: string } };
        aiError = parsed.error?.message || message;
      } else {
        aiError = message;
      }
    } catch {
      aiError = message;
    }
    console.error("AI extraction failed:", error);
  }

  const expense = await prisma.expense.create({
    data: {
      userId,
      merchant: extraction?.merchant ?? null,
      amount: extraction?.amount ?? null,
      currency: extraction?.currency ?? "EUR",
      expenseDate: extraction?.expenseDate ? new Date(extraction.expenseDate) : null,
      vatAmount: extraction?.vatAmount ?? null,
      vatRate: extraction?.vatRate ?? null,
      category: extraction?.category ?? null,
      description: extraction?.description ?? null,
      documentNumber: extraction?.documentNumber ?? null,
      taxId: extraction?.taxId ?? null,
      aiRawJson: extraction ? JSON.stringify(extraction) : null,
      aiConfidence: normalizeConfidence(extraction?.confidence),
      fileName: saved.originalName,
      fileMimeType: saved.mimeType,
      filePath: saved.relativePath,
      status: "draft",
    },
  });

  return NextResponse.json({ expense, aiError });
}
