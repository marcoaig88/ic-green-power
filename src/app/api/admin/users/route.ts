import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers } from "@/lib/roles";

const createSchema = z.object({
  name: z.string().trim().min(1),
  surname: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(6).optional(),
  aciVehicleRateId: z.string().min(1).nullable().optional(),
});

const userSelect = {
  id: true,
  name: true,
  surname: true,
  email: true,
  role: true,
  createdAt: true,
  aciVehicleRateId: true,
  aciVehicleRate: {
    select: {
      id: true,
      year: true,
      brand: true,
      model: true,
      fuelType: true,
      ratePerKm: true,
      production: true,
    },
  },
} as const;

async function requireUserManager() {
  const user = await getSessionUser();
  if (!user) return { error: NextResponse.json({ error: "Non autenticato" }, { status: 401 }) };
  if (!canManageUsers(user.role)) {
    return {
      error: NextResponse.json(
        { error: "Solo Admin IT può gestire gli utenti" },
        { status: 403 },
      ),
    };
  }
  return { user };
}

export async function GET() {
  const auth = await requireUserManager();
  if (auth.error) return auth.error;

  const users = await prisma.user.findMany({
    where: { role: "employee" },
    orderBy: [{ surname: "asc" }, { name: "asc" }],
    select: userSelect,
  });

  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const auth = await requireUserManager();
  if (auth.error) return auth.error;

  try {
    const body = createSchema.parse(await request.json());
    const email = body.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email già registrata" }, { status: 409 });
    }

    if (body.aciVehicleRateId) {
      const vehicle = await prisma.aciVehicleRate.findUnique({
        where: { id: body.aciVehicleRateId },
      });
      if (!vehicle) {
        return NextResponse.json({ error: "Veicolo ACI non trovato" }, { status: 400 });
      }
    }

    const passwordHash = await bcrypt.hash(body.password || "password123", 10);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        surname: body.surname,
        email,
        passwordHash,
        role: "employee",
        aciVehicleRateId: body.aciVehicleRateId || null,
      },
      select: userSelect,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dati non validi", details: error.flatten() }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Creazione non riuscita" }, { status: 500 });
  }
}
