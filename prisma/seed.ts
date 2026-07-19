import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const users = [
    { name: "Admin IC", email: "admin@icgreenpower.it", role: "admin" },
    { name: "Marco Rossi", email: "marco@icgreenpower.it", role: "employee" },
    { name: "Laura Bianchi", email: "laura@icgreenpower.it", role: "employee" },
    { name: "Giulia Verdi", email: "giulia@icgreenpower.it", role: "employee" },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, passwordHash },
      create: { ...user, passwordHash },
    });
  }

  console.log("Seed completato.");
  console.log("Login demo: admin@icgreenpower.it / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
