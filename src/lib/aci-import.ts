import { prisma } from "@/lib/prisma";
import { parseAciCsv, type AciCsvRow } from "@/lib/aci";

export type AciImportSummary = {
  year: number;
  imported: number;
  skipped: number;
  tableId: string;
  errors: string[];
};

export async function importAciCsv(params: {
  content: string;
  sourceFile?: string;
  replaceYear?: boolean;
}): Promise<AciImportSummary> {
  const parsed = parseAciCsv(params.content);
  if (parsed.year == null) {
    throw new Error(
      parsed.errors[0] ||
        "Impossibile determinare l'anno: tutte le righe devono avere lo stesso year",
    );
  }
  if (parsed.rows.length === 0) {
    throw new Error(parsed.errors[0] || "Nessuna riga valida da importare");
  }

  const year = parsed.year;
  const sourceFile = params.sourceFile || `aci-${year}.csv`;

  if (params.replaceYear !== false) {
    await prisma.aciRateTable.deleteMany({ where: { year } });
  }

  const table = await prisma.aciRateTable.create({
    data: {
      year,
      label: `Tabelle ACI ${year}`,
      sourceFile,
    },
  });

  const chunkSize = 200;
  let imported = 0;
  for (let i = 0; i < parsed.rows.length; i += chunkSize) {
    const chunk = parsed.rows.slice(i, i + chunkSize);
    const result = await prisma.aciVehicleRate.createMany({
      data: chunk.map((row) => toDbRow(table.id, row)),
    });
    imported += result.count;
  }

  return {
    year,
    imported,
    skipped: Math.max(0, parsed.rows.length - imported),
    tableId: table.id,
    errors: parsed.errors,
  };
}

function toDbRow(tableId: string, row: AciCsvRow) {
  return {
    tableId,
    year: row.year,
    vehicleType: row.vehicleType,
    fuelType: row.fuelType,
    production: row.production,
    brand: row.brand,
    model: row.model,
    ratePerKm: row.ratePerKm,
    fringe25: row.fringe25,
    fringe30: row.fringe30,
    fringe50: row.fringe50,
    fringe60: row.fringe60,
    rawLabel: `${row.brand} ${row.model}`.trim(),
  };
}
