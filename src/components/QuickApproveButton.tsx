"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function QuickApproveButton({ expenseId }: { expenseId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approvazione non riuscita");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          approve();
        }}
        className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
      >
        {busy ? "…" : "Approva"}
      </button>
      {error && <span className="max-w-[10rem] text-right text-[10px] text-red-600">{error}</span>}
    </div>
  );
}
