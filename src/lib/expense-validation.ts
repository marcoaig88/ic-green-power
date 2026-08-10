import { normalizeTaxId } from "@/lib/expense-duplicates";

type ReceiptFields = {
  merchant?: string | null;
  amount?: number | null;
  expenseDate?: string | Date | null;
  category?: string | null;
  taxId?: string | null;
};

/**
 * Campi obbligatori all'invio di una nota da scontrino/fattura
 * (non applicabile al rimborso chilometrico).
 */
export function receiptSubmitError(fields: ReceiptFields): string | null {
  if (!fields.merchant?.trim()) return "Indica il fornitore";
  if (
    fields.amount == null ||
    !Number.isFinite(fields.amount) ||
    fields.amount <= 0
  ) {
    return "Indica un importo valido";
  }
  const dateOk =
    fields.expenseDate instanceof Date
      ? !Number.isNaN(fields.expenseDate.getTime())
      : Boolean(fields.expenseDate && String(fields.expenseDate).trim());
  if (!dateOk) return "Indica la data spesa";
  if (!fields.category?.trim()) return "Indica la categoria";
  if (!normalizeTaxId(fields.taxId)) {
    return "Indica la P.IVA o il codice fiscale";
  }
  return null;
}
