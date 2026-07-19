import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { expensesToCsv } from "@/lib/csv";
import {
  buildExpenseWhere,
  parseExpenseFilters,
} from "@/lib/expense-filters";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const filters = parseExpenseFilters({
    q: sp.get("q") || undefined,
    status: sp.get("status") || undefined,
    category: sp.get("category") || undefined,
    userId: sp.get("userId") || undefined,
    from: sp.get("from") || undefined,
    to: sp.get("to") || undefined,
  });

  const where = buildExpenseWhere(filters, {
    role: user.role,
    sessionUserId: user.id,
  });

  const expenses = await prisma.expense.findMany({
    where,
    include: { user: { select: { name: true, email: true } } },
    orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
  });

  const csv = expensesToCsv(expenses);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `note-spese-${stamp}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
