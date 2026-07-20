-- Tabelle ACI (costi chilometrici) + link opzionale su Expense
-- Eseguibile su Supabase SQL editor oppure via script di migrazione app

CREATE TABLE IF NOT EXISTS "AciRateTable" (
  "id" TEXT PRIMARY KEY,
  "year" INTEGER NOT NULL,
  "label" TEXT,
  "sourceFile" TEXT,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "AciRateTable_year_sourceFile_key"
  ON "AciRateTable"("year", "sourceFile");
CREATE INDEX IF NOT EXISTS "AciRateTable_year_idx" ON "AciRateTable"("year");

CREATE TABLE IF NOT EXISTS "AciVehicleRate" (
  "id" TEXT PRIMARY KEY,
  "tableId" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "vehicleType" TEXT NOT NULL,
  "fuelType" TEXT NOT NULL,
  "production" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "ratePerKm" DOUBLE PRECISION NOT NULL,
  "fringe25" DOUBLE PRECISION,
  "fringe30" DOUBLE PRECISION,
  "fringe50" DOUBLE PRECISION,
  "fringe60" DOUBLE PRECISION,
  "rawLabel" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AciVehicleRate_tableId_fkey"
    FOREIGN KEY ("tableId") REFERENCES "AciRateTable"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AciVehicleRate_year_idx" ON "AciVehicleRate"("year");
CREATE INDEX IF NOT EXISTS "AciVehicleRate_year_brand_idx" ON "AciVehicleRate"("year", "brand");
CREATE INDEX IF NOT EXISTS "AciVehicleRate_year_fuelType_production_idx"
  ON "AciVehicleRate"("year", "fuelType", "production");
CREATE INDEX IF NOT EXISTS "AciVehicleRate_brand_model_idx" ON "AciVehicleRate"("brand", "model");

ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "aciVehicleRateId" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "vehicleBrand" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "vehicleModel" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Expense_aciVehicleRateId_fkey'
  ) THEN
    ALTER TABLE "Expense"
      ADD CONSTRAINT "Expense_aciVehicleRateId_fkey"
      FOREIGN KEY ("aciVehicleRateId") REFERENCES "AciVehicleRate"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Expense_aciVehicleRateId_idx" ON "Expense"("aciVehicleRateId");
