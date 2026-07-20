/**
 * Import tabelle ACI (costi chilometrici di esercizio).
 *
 * Formato ufficiale tipico (GU / Excel di settore):
 * - suddivisione per alimentazione e in/fuori produzione
 * - colonne: marca, modello, costo €/km, fringe benefit (25/30/50/60%)
 *
 * CSV atteso (separatore `;`, UTF-8, decimali con `.` o `,`):
 * year;vehicleType;fuelType;production;brand;model;ratePerKm;fringe25;fringe30;fringe50;fringe60
 */

export const ACI_FUEL_TYPES = [
  "benzina",
  "gasolio",
  "gpl",
  "metano",
  "ibrido_benzina",
  "ibrido_gasolio",
  "plug_in",
  "elettrico",
  "altro",
] as const;

export const ACI_VEHICLE_TYPES = [
  "autoveicolo",
  "motoveicolo",
  "autocaravan",
] as const;

export const ACI_PRODUCTION = ["in_produzione", "fuori_produzione"] as const;

export type AciFuelType = (typeof ACI_FUEL_TYPES)[number];
export type AciVehicleType = (typeof ACI_VEHICLE_TYPES)[number];
export type AciProduction = (typeof ACI_PRODUCTION)[number];

export type AciCsvRow = {
  year: number;
  vehicleType: AciVehicleType;
  fuelType: AciFuelType;
  production: AciProduction;
  brand: string;
  model: string;
  ratePerKm: number;
  fringe25: number | null;
  fringe30: number | null;
  fringe50: number | null;
  fringe60: number | null;
};

export type AciParseResult = {
  rows: AciCsvRow[];
  errors: string[];
  year: number | null;
};

const FUEL_ALIASES: Record<string, AciFuelType> = {
  benzina: "benzina",
  petrol: "benzina",
  gasolio: "gasolio",
  diesel: "gasolio",
  gpl: "gpl",
  "benzina-gpl": "gpl",
  "benzina_gpl": "gpl",
  metano: "metano",
  cng: "metano",
  ibrido_benzina: "ibrido_benzina",
  "ibrido-benzina": "ibrido_benzina",
  "ibrido benzina": "ibrido_benzina",
  hybrid_benzina: "ibrido_benzina",
  ibrido_gasolio: "ibrido_gasolio",
  "ibrido-gasolio": "ibrido_gasolio",
  "ibrido gasolio": "ibrido_gasolio",
  hybrid_diesel: "ibrido_gasolio",
  plug_in: "plug_in",
  "plug-in": "plug_in",
  plugin: "plug_in",
  phev: "plug_in",
  elettrico: "elettrico",
  electric: "elettrico",
  bev: "elettrico",
  altro: "altro",
};

const VEHICLE_ALIASES: Record<string, AciVehicleType> = {
  autoveicolo: "autoveicolo",
  auto: "autoveicolo",
  autovettura: "autoveicolo",
  motoveicolo: "motoveicolo",
  moto: "motoveicolo",
  motociclo: "motoveicolo",
  autocaravan: "autocaravan",
  camper: "autocaravan",
};

const PRODUCTION_ALIASES: Record<string, AciProduction> = {
  in_produzione: "in_produzione",
  "in produzione": "in_produzione",
  produzione: "in_produzione",
  in: "in_produzione",
  fuori_produzione: "fuori_produzione",
  "fuori produzione": "fuori_produzione",
  fuori: "fuori_produzione",
  out: "fuori_produzione",
};

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function parseNumber(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function splitCsvLine(line: string, sep: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === sep && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

function detectSeparator(headerLine: string) {
  const semi = (headerLine.match(/;/g) || []).length;
  const comma = (headerLine.match(/,/g) || []).length;
  return semi >= comma ? ";" : ",";
}

function mapHeader(name: string): string | null {
  const key = normalizeKey(name).replace(/[.\s]+/g, "_");
  const aliases: Record<string, string> = {
    year: "year",
    anno: "year",
    vehicletype: "vehicleType",
    vehicle_type: "vehicleType",
    tipo: "vehicleType",
    tipo_veicolo: "vehicleType",
    fueltype: "fuelType",
    fuel_type: "fuelType",
    alimentazione: "fuelType",
    production: "production",
    produzione: "production",
    brand: "brand",
    marca: "brand",
    model: "model",
    modello: "model",
    rateperkm: "ratePerKm",
    rate_per_km: "ratePerKm",
    costo_km: "ratePerKm",
    costo_chilometrico: "ratePerKm",
    euro_km: "ratePerKm",
    "€_km": "ratePerKm",
    fringe25: "fringe25",
    fringe_25: "fringe25",
    fringe30: "fringe30",
    fringe_30: "fringe30",
    fringe50: "fringe50",
    fringe_50: "fringe50",
    fringe60: "fringe60",
    fringe_60: "fringe60",
  };
  return aliases[key] || null;
}

export function parseAciCsv(content: string): AciParseResult {
  const text = content.replace(/^\uFEFF/, "").trim();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { rows: [], errors: ["CSV vuoto o senza righe dati"], year: null };
  }

  const sep = detectSeparator(lines[0]);
  const headerCells = splitCsvLine(lines[0], sep);
  const headerMap = headerCells.map(mapHeader);

  const required = ["year", "brand", "model", "ratePerKm"] as const;
  for (const col of required) {
    if (!headerMap.includes(col)) {
      return {
        rows: [],
        errors: [`Colonna obbligatoria mancante: ${col} (accetta anche marca/modello/costo_km/anno)`],
        year: null,
      };
    }
  }

  const rows: AciCsvRow[] = [];
  const errors: string[] = [];
  const years = new Set<number>();

  for (let i = 1; i < lines.length; i++) {
    const lineNo = i + 1;
    const cells = splitCsvLine(lines[i], sep);
    const raw: Record<string, string> = {};
    headerMap.forEach((key, idx) => {
      if (key) raw[key] = cells[idx] ?? "";
    });

    const year = parseNumber(raw.year || "");
    const ratePerKm = parseNumber(raw.ratePerKm || "");
    const brand = (raw.brand || "").trim();
    const model = (raw.model || "").trim();

    if (year == null || !Number.isInteger(year) || year < 2000 || year > 2100) {
      errors.push(`Riga ${lineNo}: anno non valido`);
      continue;
    }
    if (!brand || !model) {
      errors.push(`Riga ${lineNo}: marca/modello obbligatori`);
      continue;
    }
    if (ratePerKm == null || ratePerKm <= 0 || ratePerKm > 10) {
      errors.push(`Riga ${lineNo}: ratePerKm non valido (${raw.ratePerKm || "vuoto"})`);
      continue;
    }

    const fuelRaw = normalizeKey(raw.fuelType || "altro");
    const fuelType = FUEL_ALIASES[fuelRaw] || FUEL_ALIASES[fuelRaw.replace(/ /g, "_")] || "altro";
    const vehicleRaw = normalizeKey(raw.vehicleType || "autoveicolo");
    const vehicleType =
      VEHICLE_ALIASES[vehicleRaw] || VEHICLE_ALIASES[vehicleRaw.replace(/ /g, "_")] || "autoveicolo";
    const productionRaw = normalizeKey(raw.production || "in_produzione");
    const production =
      PRODUCTION_ALIASES[productionRaw] ||
      PRODUCTION_ALIASES[productionRaw.replace(/ /g, "_")] ||
      "in_produzione";

    years.add(year);
    rows.push({
      year,
      vehicleType,
      fuelType,
      production,
      brand,
      model,
      ratePerKm,
      fringe25: parseNumber(raw.fringe25 || ""),
      fringe30: parseNumber(raw.fringe30 || ""),
      fringe50: parseNumber(raw.fringe50 || ""),
      fringe60: parseNumber(raw.fringe60 || ""),
    });
  }

  const year = years.size === 1 ? [...years][0] : years.size > 1 ? null : null;
  if (years.size > 1) {
    errors.push(
      `Il file contiene più annualità (${[...years].sort().join(", ")}). Importa un anno alla volta.`,
    );
  }

  return { rows, errors, year: years.size === 1 ? [...years][0]! : year };
}
