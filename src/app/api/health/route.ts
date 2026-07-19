import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || "";
  const host = dbUrl.split("@")[1]?.split("/")[0] || "(mancante)";
  const hasPooler = dbUrl.includes("pooler.supabase.com");
  const hasPort6543 = dbUrl.includes(":6543");

  try {
    const users = await prisma.user.count();
    return NextResponse.json({
      ok: true,
      users,
      databaseHost: host,
      hasPooler,
      hasPort6543,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        databaseHost: host,
        hasPooler,
        hasPort6543,
        error: error instanceof Error ? error.message : "Errore sconosciuto",
      },
      { status: 500 },
    );
  }
}
