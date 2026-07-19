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
