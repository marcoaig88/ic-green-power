import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageUsers } from "@/lib/roles";
import { hasNameSurnameClash } from "@/lib/user";

const patchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  surname: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  aciVehicleRateId: z.string().min(1).nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  if (!canManageUsers(session.role)) {
    return NextResponse.json(
      { error: "Solo Admin IT può gestire gli utenti" },
      { status: 403 },
    );
  }

  const { id } = await params;

  try {
    const body = patchSchema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.role !== "employee") {
      return NextResponse.json({ error: "Dipendente non trovato" }, { status: 404 });
    }

    if (body.email) {
      const email = body.email.toLowerCase();
      const clash = await prisma.user.findFirst({
        where: { email, NOT: { id } },
      });
      if (clash) {
        return NextResponse.json({ error: "Email già in uso" }, { status: 409 });
      }
    }

    const nextName = body.name ?? existing.name;
    const nextSurname = body.surname ?? existing.surname;
    if (
      (body.name !== undefined || body.surname !== undefined) &&
      (await hasNameSurnameClash(nextName, nextSurname, id))
    ) {
      return NextResponse.json(
        { error: "Esiste già un utente con lo stesso nome e cognome" },
        { status: 409 },
      );
    }

    if (body.aciVehicleRateId) {
      const vehicle = await prisma.aciVehicleRate.findUnique({
        where: { id: body.aciVehicleRateId },
      });
      if (!vehicle) {
        return NextResponse.json({ error: "Veicolo ACI non trovato" }, { status: 400 });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        name: body.name,
        surname: body.surname,
        email: body.email?.toLowerCase(),
        aciVehicleRateId:
          body.aciVehicleRateId === undefined ? undefined : body.aciVehicleRateId,
      },
      select: {
        id: true,
        name: true,
        surname: true,
        email: true,
        aciVehicleRateId: true,
        aciVehicleRate: {
          select: {
            id: true,
            year: true,
            brand: true,
            model: true,
            fuelType: true,
            ratePerKm: true,
          },
        },
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Aggiornamento non riuscito" }, { status: 500 });
  }
}
