import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveUpload } from "@/lib/files";
import {
  extractReceiptFromFile,
  normalizeConfidence,
} from "@/lib/extract-receipt";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const expenses = await prisma.expense.findMany({
    where: user.role === "admin" ? undefined : { userId: user.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ expenses });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  try {
    const form = await request.formData();
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
      // Surface Google API JSON message if present
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
        userId: user.id,
        merchant: extraction?.merchant ?? null,
        amount: extraction?.amount ?? null,
        currency: extraction?.currency ?? "EUR",
        expenseDate: extraction?.expenseDate ? new Date(extraction.expenseDate) : null,
        vatAmount: extraction?.vatAmount ?? null,
        vatRate: extraction?.vatRate ?? null,
        category: extraction?.category ?? null,
        description: extraction?.description ?? null,
        documentNumber: extraction?.documentNumber ?? null,
        aiRawJson: extraction ? JSON.stringify(extraction) : null,
        aiConfidence: normalizeConfidence(extraction?.confidence),
        fileName: saved.originalName,
        fileMimeType: saved.mimeType,
        filePath: saved.relativePath,
        status: "draft",
      },
    });

    return NextResponse.json({ expense, aiError });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Errore durante il caricamento";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
