import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseDbUrl(raw: string) {
  try {
    const url = new URL(raw);
    return {
      host: url.host || "(vuoto)",
      username: decodeURIComponent(url.username || "(vuoto)"),
      hasPassword: Boolean(url.password),
      passwordLength: url.password ? decodeURIComponent(url.password).length : 0,
      hasPooler: raw.includes("pooler.supabase.com"),
      hasPort6543: url.port === "6543" || raw.includes(":6543"),
    };
  } catch {
    return {
      host: "(URL non valida)",
      username: "(URL non valida)",
      hasPassword: false,
      passwordLength: 0,
      hasPooler: false,
      hasPort6543: false,
    };
  }
}

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || "";
  const info = parseDbUrl(dbUrl);

  try {
    const users = await prisma.user.count();
    return NextResponse.json({
      ok: true,
      users,
      ...info,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        ...info,
        error: error instanceof Error ? error.message : "Errore sconosciuto",
        hint:
          info.username === "postgres"
            ? "Sul pooler lo username deve essere postgres.pfptyzithnemqoggtyww (con il project ref), non solo postgres."
            : "Verifica password. Su Vercel prova la password con ! letterale (non %21).",
      },
      { status: 500 },
    );
  }
}
