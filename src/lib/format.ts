export function formatMoney(amount: number | null | undefined, currency = "EUR") {
  if (amount == null || Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: currency || "EUR",
  }).format(amount);
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** Solo ora (caricamento nota). */
export function formatTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Data + ora (es. caricamento). */
export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Data documento (o fallback) + ora di caricamento. */
export function formatExpenseDateWithUploadTime(
  expenseDate: Date | string | null | undefined,
  createdAt: Date | string | null | undefined,
) {
  const day = formatDate(expenseDate || createdAt);
  const time = formatTime(createdAt);
  if (day === "—" || time === "—") return day;
  return `${day}, ${time}`;
}

export const STATUS_LABELS: Record<string, string> = {
  draft: "Bozza",
  submitted: "Inviata",
  approved: "Approvata",
  rejected: "Rifiutata",
};

export const CATEGORY_LABELS: Record<string, string> = {
  vitto: "Vitto",
  viaggio: "Viaggio",
  alloggio: "Alloggio",
  trasporto: "Trasporto",
  chilometrico: "Rimborso chilometrico",
  materiale: "Materiale",
  software: "Software",
  altro: "Altro",
};

/** Bounds di giornata per filtri (input type=date → YYYY-MM-DD). */
export function dayRangeFromInputs(from?: string, to?: string) {
  let start = from || "";
  let end = to || "";
  if (start && end && start > end) {
    [start, end] = [end, start];
  }

  const range: { gte?: Date; lte?: Date } = {};
  if (start) range.gte = new Date(`${start}T00:00:00.000Z`);
  if (end) range.lte = new Date(`${end}T23:59:59.999Z`);
  return range;
}
