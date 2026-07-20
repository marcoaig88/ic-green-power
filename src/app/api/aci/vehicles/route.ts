import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  if (user.role !== "admin" && user.role !== "employee") {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const q = (sp.get("q") || "").trim();
  const brand = (sp.get("brand") || "").trim();
  const fuelType = (sp.get("fuelType") || "").trim();
  const yearParam = sp.get("year");
  const year = yearParam ? Number(yearParam) : undefined;
  const limit = Math.min(Number(sp.get("limit") || 40), 100);

  const latestYear = await prisma.aciVehicleRate.findFirst({
    orderBy: { year: "desc" },
    select: { year: true },
  });

  const effectiveYear = year || latestYear?.year;
  if (!effectiveYear) {
    return NextResponse.json({
      year: null,
      vehicles: [],
      brands: [],
      fuelTypes: [],
      message: "Nessuna tabella ACI importata",
    });
  }

  const where = {
    year: effectiveYear,
    ...(fuelType ? { fuelType } : {}),
    ...(brand ? { brand: { equals: brand, mode: "insensitive" as const } } : {}),
    ...(q
      ? {
          OR: [
            { brand: { contains: q, mode: "insensitive" as const } },
            { model: { contains: q, mode: "insensitive" as const } },
            { rawLabel: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [vehicles, brandsRaw, fuelsRaw] = await Promise.all([
    prisma.aciVehicleRate.findMany({
      where,
      orderBy: [{ brand: "asc" }, { model: "asc" }],
      take: limit,
      select: {
        id: true,
        year: true,
        brand: true,
        model: true,
        fuelType: true,
        production: true,
        ratePerKm: true,
        vehicleType: true,
      },
    }),
    prisma.aciVehicleRate.findMany({
      where: { year: effectiveYear, ...(fuelType ? { fuelType } : {}) },
      distinct: ["brand"],
      orderBy: { brand: "asc" },
      select: { brand: true },
    }),
    prisma.aciVehicleRate.findMany({
      where: { year: effectiveYear },
      distinct: ["fuelType"],
      orderBy: { fuelType: "asc" },
      select: { fuelType: true },
    }),
  ]);

  return NextResponse.json({
    year: effectiveYear,
    vehicles,
    brands: brandsRaw.map((b) => b.brand),
    fuelTypes: fuelsRaw.map((f) => f.fuelType),
  });
}
