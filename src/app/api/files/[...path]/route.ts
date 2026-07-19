import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSignedFileUrl, readUpload } from "@/lib/files";

type Params = { params: Promise<{ path: string[] }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { path: segments } = await params;
  const fileName = segments[segments.length - 1];
  if (!fileName || segments.some((s) => s.includes(".."))) {
    return NextResponse.json({ error: "Percorso non valido" }, { status: 400 });
  }

  const expense = await prisma.expense.findFirst({
    where: {
      filePath: { endsWith: fileName },
    },
  });

  if (!expense?.filePath) {
    return NextResponse.json({ error: "File non trovato" }, { status: 404 });
  }

  if (user.role !== "admin" && expense.userId !== user.id) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  // Preferisci redirect a URL firmato Supabase (più efficiente)
  const signed = await getSignedFileUrl(expense.filePath);
  if (signed) {
    return NextResponse.redirect(signed);
  }

  try {
    const data = await readUpload(expense.filePath);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": expense.fileMimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${expense.fileName || "allegato"}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File non disponibile" }, { status: 404 });
  }
}
