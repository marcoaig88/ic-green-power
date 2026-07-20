import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/format";
import { fullName } from "@/lib/user";
import { isPrivateMileageVehicle } from "@/lib/mileage";

type CsvExpense = {
  id?: string;
  expenseDate: Date | null;
  createdAt: Date;
  merchant: string | null;
  description: string | null;
  documentNumber: string | null;
  taxId: string | null;
  km: number | null;
  ratePerKm: number | null;
  routeFrom: string | null;
  routeTo: string | null;
  category: string | null;
  amount: number | null;
  currency: string;
  vatAmount: number | null;
  vatRate: number | null;
  status: string;
  rejectionReason?: string | null;
  vehicleBrand?: string | null;
  vehicleModel?: string | null;
  aciVehicleRateId?: string | null;
  user: { name: string; surname?: string | null; email: string };
};

/** Sempre tra virgolette: Excel IT non spezza i decimali con virgola. */
function cell(value: string | number | null | undefined) {
  if (value == null) return '""';
  const text = String(value).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return `"${text.replace(/"/g, '""')}"`;
}

function formatCsvDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Rome",
  }).format(date);
}

function formatCsvDateTime(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  }).format(date);
}

function formatCsvNumber(value: number | null | undefined, digits = 2) {
  if (value == null || Number.isNaN(value)) return "";
  return value.toFixed(digits).replace(".", ",");
}

function vehicleLabel(expense: CsvExpense) {
  if (expense.km == null && expense.category !== "chilometrico") return "";
  if (isPrivateMileageVehicle(expense)) return "Auto privata";
  const name = [expense.vehicleBrand, expense.vehicleModel].filter(Boolean).join(" ");
  return name || (expense.aciVehicleRateId ? "Auto aziendale" : "");
}

/**
 * CSV per Excel italiano:
 * - prima riga sep=;
 * - BOM UTF-8
 * - tutte le celle quotate
 * - date gg/mm/aaaa
 * - decimali con virgola
 */
export function expensesToCsv(expenses: CsvExpense[]) {
  const header = [
    "ID",
    "Data spesa",
    "Data caricamento",
    "Fornitore / Percorso",
    "Dipendente",
    "Email",
    "Categoria",
    "Importo",
    "Valuta",
    "IVA",
    "Aliquota IVA %",
    "Stato",
    "Motivo rifiuto",
    "N. documento",
    "P.IVA / CF",
    "Km",
    "Tariffa EUR/km",
    "Partenza",
    "Destinazione",
    "Veicolo",
    "Descrizione",
  ];

  const rows = expenses.map((expense) => [
    cell(expense.id || ""),
    cell(formatCsvDate(expense.expenseDate || expense.createdAt)),
    cell(formatCsvDateTime(expense.createdAt)),
    cell(expense.merchant || ""),
    cell(fullName(expense.user)),
    cell(expense.user.email),
    cell(
      expense.category
        ? CATEGORY_LABELS[expense.category] || expense.category
        : "",
    ),
    cell(formatCsvNumber(expense.amount, 2)),
    cell(expense.currency || "EUR"),
    cell(formatCsvNumber(expense.vatAmount, 2)),
    cell(
      expense.vatRate != null && !Number.isNaN(expense.vatRate)
        ? formatCsvNumber(expense.vatRate, 2)
        : "",
    ),
    cell(STATUS_LABELS[expense.status] || expense.status),
    cell(expense.rejectionReason || ""),
    cell(expense.documentNumber || ""),
    cell(expense.taxId || ""),
    cell(formatCsvNumber(expense.km, 1)),
    cell(formatCsvNumber(expense.ratePerKm, 4)),
    cell(expense.routeFrom || ""),
    cell(expense.routeTo || ""),
    cell(vehicleLabel(expense)),
    cell(expense.description || ""),
  ]);

  const lines = [
    "sep=;",
    header.map((h) => cell(h)).join(";"),
    ...rows.map((row) => row.join(";")),
  ];

  return `\uFEFF${lines.join("\r\n")}`;
}
