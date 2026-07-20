import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "surname" TEXT NOT NULL DEFAULT '';
  `);

  const users = await prisma.user.findMany({
    select: { id: true, name: true, surname: true },
  });

  for (const user of users) {
    if (user.surname?.trim()) continue;
    const parts = user.name.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const name = parts[0]!;
    const surname = parts.slice(1).join(" ");
    await prisma.user.update({
      where: { id: user.id },
      data: { name, surname },
    });
    console.log(`split ${user.id}: ${name} / ${surname}`);
  }

  console.log("surname column ready");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
