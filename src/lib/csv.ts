import { CATEGORY_LABELS, STATUS_LABELS, formatDate } from "@/lib/format";

type CsvExpense = {
  expenseDate: Date | null;
  createdAt: Date;
  merchant: string | null;
  description: string | null;
  documentNumber: string | null;
  taxId: string | null;
  category: string | null;
  amount: number | null;
  currency: string;
  vatAmount: number | null;
  vatRate: number | null;
  status: string;
  user: { name: string; email: string };
};

function escapeCsv(value: string) {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function cell(value: string | number | null | undefined) {
  if (value == null) return "";
  return escapeCsv(String(value));
}

/** CSV Excel-friendly (sep=; + UTF-8 BOM). */
export function expensesToCsv(expenses: CsvExpense[]) {
  const header = [
    "Data",
    "Fornitore",
    "Dipendente",
    "Email",
    "Categoria",
    "Importo",
    "Valuta",
    "IVA",
    "Aliquota IVA",
    "Stato",
    "N. documento",
    "P.IVA / CF",
    "Descrizione",
  ];

  const rows = expenses.map((expense) => [
    cell(formatDate(expense.expenseDate || expense.createdAt)),
    cell(expense.merchant || ""),
    cell(expense.user.name),
    cell(expense.user.email),
    cell(
      expense.category
        ? CATEGORY_LABELS[expense.category] || expense.category
        : "",
    ),
    cell(expense.amount != null ? expense.amount.toFixed(2).replace(".", ",") : ""),
    cell(expense.currency || "EUR"),
    cell(expense.vatAmount != null ? expense.vatAmount.toFixed(2).replace(".", ",") : ""),
    cell(expense.vatRate != null ? `${expense.vatRate}%` : ""),
    cell(STATUS_LABELS[expense.status] || expense.status),
    cell(expense.documentNumber || ""),
    cell(expense.taxId || ""),
    cell(expense.description || ""),
  ]);

  const lines = [header.join(";"), ...rows.map((row) => row.join(";"))];
  return `\uFEFF${lines.join("\r\n")}`;
}
