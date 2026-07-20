import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ROLES } from "../src/lib/roles";

const prisma = new PrismaClient();

async function main() {
  const defaultPasswordHash = await bcrypt.hash("password123", 10);
  const adminItPasswordHash = await bcrypt.hash("b", 10);

  // Migra eventuali admin legacy
  await prisma.user.updateMany({
    where: { role: "admin" },
    data: { role: ROLES.adminIt },
  });

  // Admin IT: utente "a" / password "b" (non compare nel picker)
  const legacyAdmin = await prisma.user.findUnique({
    where: { email: "admin@icgreenpower.it" },
  });
  const adminByA = await prisma.user.findUnique({ where: { email: "a" } });

  if (legacyAdmin && !adminByA) {
    await prisma.user.update({
      where: { id: legacyAdmin.id },
      data: {
        name: "Admin IT",
        email: "a",
        role: ROLES.adminIt,
        passwordHash: adminItPasswordHash,
      },
    });
  } else if (legacyAdmin && adminByA && legacyAdmin.id !== adminByA.id) {
    await prisma.user.update({
      where: { id: adminByA.id },
      data: {
        name: "Admin IT",
        role: ROLES.adminIt,
        passwordHash: adminItPasswordHash,
      },
    });
    await prisma.user.delete({ where: { id: legacyAdmin.id } });
  } else {
    await prisma.user.upsert({
      where: { email: "a" },
      update: {
        name: "Admin IT",
        role: ROLES.adminIt,
        passwordHash: adminItPasswordHash,
      },
      create: {
        name: "Admin IT",
        email: "a",
        role: ROLES.adminIt,
        passwordHash: adminItPasswordHash,
      },
    });
  }

  const users = [
    {
      name: "Responsabile HR",
      email: "responsabile@icgreenpower.it",
      role: ROLES.responsabile,
    },
    { name: "Marco Rossi", email: "marco@icgreenpower.it", role: ROLES.employee },
    { name: "Laura Bianchi", email: "laura@icgreenpower.it", role: ROLES.employee },
    { name: "Giulia Verdi", email: "giulia@icgreenpower.it", role: ROLES.employee },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, passwordHash: defaultPasswordHash },
      create: { ...user, passwordHash: defaultPasswordHash },
    });
  }

  console.log("Seed completato.");
  console.log("Admin IT: utente a / password b");
  console.log("Altri: responsabile@icgreenpower.it / password123 (o selezione profilo)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
