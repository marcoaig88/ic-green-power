import { prisma } from "@/lib/prisma";

export function fullName(user: { name: string; surname?: string | null }) {
  return [user.name, user.surname]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
}

/** True se esiste già un utente con stesso nome+cognome (case-insensitive). */
export async function hasNameSurnameClash(
  name: string,
  surname: string,
  excludeUserId?: string,
) {
  const clash = await prisma.user.findFirst({
    where: {
      name: { equals: name.trim(), mode: "insensitive" },
      surname: { equals: surname.trim(), mode: "insensitive" },
      ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
    },
    select: { id: true },
  });
  return Boolean(clash);
}
