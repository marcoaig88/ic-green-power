import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { fetchDrivingDistanceKm } from "@/lib/google-maps-distance";

const bodySchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  roundTrip: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "GOOGLE_MAPS_API_KEY non configurata. Aggiungila su Vercel / .env e abilita Distance Matrix API.",
      },
      { status: 503 },
    );
  }

  try {
    const body = bodySchema.parse(await request.json());
    const result = await fetchDrivingDistanceKm({
      from: body.from,
      to: body.to,
      apiKey,
      roundTrip: body.roundTrip,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "Calcolo distanza non riuscito";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
