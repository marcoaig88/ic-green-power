import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { importAciCsv } from "@/lib/aci-import";
import { canImportAci } from "@/lib/roles";

export const dynamic = "force-dynamic";

/** POST multipart: file=aci.csv  oppure JSON { csv, sourceFile?, replaceYear? } */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  if (!canImportAci(user.role)) {
    return NextResponse.json({ error: "Solo Admin IT" }, { status: 403 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    let csv = "";
    let sourceFile = "upload.csv";
    let replaceYear = true;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json({ error: "Carica un file CSV" }, { status: 400 });
      }
      csv = await file.text();
      sourceFile = file.name || sourceFile;
      const replace = form.get("replaceYear");
      if (replace === "false" || replace === "0") replaceYear = false;
    } else {
      const body = (await request.json()) as {
        csv?: string;
        sourceFile?: string;
        replaceYear?: boolean;
      };
      if (!body.csv?.trim()) {
        return NextResponse.json({ error: "Campo csv obbligatorio" }, { status: 400 });
      }
      csv = body.csv;
      sourceFile = body.sourceFile || sourceFile;
      replaceYear = body.replaceYear !== false;
    }

    const summary = await importAciCsv({ content: csv, sourceFile, replaceYear });
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Import non riuscito";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  if (!canImportAci(user.role)) {
    return NextResponse.json({ error: "Solo Admin IT" }, { status: 403 });
  }

  const { prisma } = await import("@/lib/prisma");
  const tables = await prisma.aciRateTable.findMany({
    orderBy: { year: "desc" },
    include: { _count: { select: { rows: true } } },
  });

  return NextResponse.json({
    tables: tables.map((t) => ({
      id: t.id,
      year: t.year,
      label: t.label,
      sourceFile: t.sourceFile,
      importedAt: t.importedAt,
      rowCount: t._count.rows,
    })),
  });
}
