import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "aciVehicleRateId" TEXT`,
  );
  await prisma.$executeRawUnsafe(`
    DO $body$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'User_aciVehicleRateId_fkey'
      ) THEN
        ALTER TABLE "User"
          ADD CONSTRAINT "User_aciVehicleRateId_fkey"
          FOREIGN KEY ("aciVehicleRateId") REFERENCES "AciVehicleRate"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END
    $body$
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "User_aciVehicleRateId_idx" ON "User"("aciVehicleRateId")`,
  );
  console.log("User.aciVehicleRateId ok");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
