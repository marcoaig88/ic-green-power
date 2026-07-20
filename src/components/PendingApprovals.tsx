"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDate, formatMoney } from "@/lib/format";
import { isMileageExpense } from "@/lib/mileage";
import { AiConfidenceBadge } from "@/components/AiConfidenceBadge";
import { StatusBadge } from "@/components/StatusBadge";

export type PendingExpense = {
  id: string;
  merchant: string | null;
  amount: number | null;
  currency: string;
  expenseDate: string | Date | null;
  createdAt: string | Date;
  aiConfidence: number | null;
  category?: string | null;
  km?: number | null;
  user: { name: string };
  status: string;
  /** Se false, niente tasto Approva */
  canApprove?: boolean;
  /** Evidenzia (es. spese proprie CFO in attesa del COO) */
  highlight?: boolean;
};

export function PendingApprovals({
  expenses,
  emptyMessage = "Nessuna spesa in attesa. Ottimo lavoro.",
}: {
  expenses: PendingExpense[];
  emptyMessage?: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState(expenses);

  useEffect(() => {
    setItems(expenses);
  }, [expenses]);

  async function approve(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approvazione non riuscita");
      setItems((prev) => prev.filter((item) => item.id !== id));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <ul className="divide-y divide-line/70">
        {items.map((expense) => {
          const mileage = isMileageExpense(expense);
          const allowApprove = expense.canApprove !== false;
          return (
            <li
              key={expense.id}
              className={`flex flex-wrap items-center justify-between gap-3 py-3 ${
                expense.highlight
                  ? "-mx-2 rounded-lg border border-amber-300/80 bg-amber-50 px-2"
                  : ""
              }`}
            >
              <div className="min-w-0">
                <Link
                  href={`/expenses/${expense.id}`}
                  className="font-semibold text-ink hover:text-brand"
                >
                  {expense.merchant || "Da completare"}
                </Link>
                <p className="text-xs text-muted">
                  {expense.user.name} ·{" "}
                  {formatDate(expense.expenseDate || expense.createdAt)}
                </p>
                {expense.highlight && (
                  <p className="mt-1 text-xs font-semibold text-amber-800">
                    In attesa del COO — non puoi approvare le tue spese
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {!mileage && <AiConfidenceBadge value={expense.aiConfidence} />}
                <span className="font-medium">
                  {formatMoney(expense.amount, expense.currency)}
                </span>
                <StatusBadge status={expense.status} />
                {allowApprove ? (
                  <button
                    type="button"
                    disabled={busyId === expense.id}
                    onClick={() => approve(expense.id)}
                    className="rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
                  >
                    {busyId === expense.id ? "…" : "Approva"}
                  </button>
                ) : (
                  <span className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800">
                    Solo COO
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
