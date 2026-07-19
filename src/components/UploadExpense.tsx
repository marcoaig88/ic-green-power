"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function UploadExpense() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Seleziona una foto o un PDF dello scontrino.");
      return;
    }

    setLoading(true);
    setError(null);
    setHint(null);

    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/expenses", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Caricamento non riuscito");

      const qs = data.aiError
        ? `?aiError=${encodeURIComponent(data.aiError)}`
        : "";
      router.push(`/expenses/${data.expense.id}${qs}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="brand-title brand-title--ink text-3xl sm:text-4xl">Nuova nota spesa</h1>
        <p className="brand-subtitle brand-subtitle--ink mt-2 text-base">
          Carica lo scontrino: Gemini estrae fornitore, importo, data e IVA. Poi controlli e
          confermi.
        </p>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line bg-white/60 px-6 py-12 text-center transition hover:border-brand hover:bg-brand-soft/40">
        <span className="font-medium text-brand-deep">
          {file ? file.name : "Trascina o seleziona foto / PDF"}
        </span>
        <span className="text-sm text-muted">JPG, PNG, WEBP o PDF · max 10MB</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}
      {hint && <p className="text-sm text-warn">{hint}</p>}

      <button
        type="submit"
        disabled={loading || !file}
        className="w-full rounded-md bg-brand px-4 py-3 font-medium text-white transition hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Analisi in corso…" : "Carica ed estrai con AI"}
      </button>
    </form>
  );
}
