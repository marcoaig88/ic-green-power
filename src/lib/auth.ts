import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "./prisma";
import { fullName } from "./user";

const COOKIE_NAME = "icgp_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

function getSecret() {
  return process.env.SESSION_SECRET || "dev-secret";
}

function sign(payload: string) {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createSessionToken(user: SessionUser) {
  const body = Buffer.from(
    JSON.stringify({ ...user, exp: Date.now() + MAX_AGE_SECONDS * 1000 }),
  ).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string): SessionUser | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionUser & {
      exp: number;
    };
    if (!data.exp || data.exp < Date.now()) return null;
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
    };
  } catch {
    return null;
  }
}

export async function setSession(user: SessionUser) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = verifySessionToken(token);
  if (!session) return null;

  try {
    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) return null;

    return {
      id: user.id,
      name: fullName(user),
      email: user.email,
      role: user.role,
    };
  } catch (error) {
    console.error("getSessionUser DB error:", error);
    return null;
  }
}
