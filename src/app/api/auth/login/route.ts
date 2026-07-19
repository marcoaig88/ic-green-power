import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/auth";

const bodySchema = z.union([
  z.object({ userId: z.string().min(1) }),
  z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
]);

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());

    const user =
      "userId" in body
        ? await prisma.user.findUnique({ where: { id: body.userId } })
        : await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });

    if (!user) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 401 });
    }

    if ("password" in body) {
      const ok = await bcrypt.compare(body.password, user.passwordHash);
      if (!ok) {
        return NextResponse.json({ error: "Credenziali non valide" }, { status: 401 });
      }
    }

    await setSession({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Dati non validi" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Errore di login" }, { status: 500 });
  }
}
