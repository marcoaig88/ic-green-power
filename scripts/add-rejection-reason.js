const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT',
    );
    console.log("OK: rejectionReason column ready");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
