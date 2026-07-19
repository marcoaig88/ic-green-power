"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_MILEAGE_RATE,
  calcMileageAmount,
} from "@/lib/mileage";
import { formatMoney } from "@/lib/format";

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

export function MileageExpenseForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    expenseDate: todayInput(),
    routeFrom: "",
    routeTo: "",
    km: "",
    ratePerKm: String(DEFAULT_MILEAGE_RATE),
    description: "",
  });

  const amount = useMemo(() => {
    const km = Number(form.km);
    const rate = Number(form.ratePerKm);
    return calcMileageAmount(km, rate);
  }, [form.km, form.ratePerKm]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(asSubmitted: boolean) {
    setSaving(true);
    setError(null);
    try {
      const km = Number(form.km);
      const ratePerKm = Number(form.ratePerKm);
      if (!form.routeFrom.trim() || !form.routeTo.trim()) {
        throw new Error("Indica partenza e destinazione");
      }
      if (!Number.isFinite(km) || km <= 0) {
        throw new Error("Inserisci i chilometri percorsi");
      }
      if (!Number.isFinite(ratePerKm) || ratePerKm <= 0) {
        throw new Error("Tariffa €/km non valida");
      }

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "mileage",
          expenseDate: form.expenseDate,
          routeFrom: form.routeFrom.trim(),
          routeTo: form.routeTo.trim(),
          km,
          ratePerKm,
          description: form.description.trim() || null,
          submit: asSubmitted,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Salvataggio non riuscito");

      if (asSubmitted) {
        router.push("/expenses");
      } else {
        router.push(`/expenses/${data.expense.id}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
      setSaving(false);
    }
  }

  return (
    <form
      className="space-y-4 rounded-xl border border-line bg-white/80 p-5 backdrop-blur-sm"
      onSubmit={(e) => {
        e.preventDefault();
        submit(true);
      }}
    >
      <div>
        <h2 className="font-display text-lg font-bold text-brand-deep">
          Rimborso chilometrico
        </h2>
        <p className="mt-1 text-sm text-muted">
          Nessun documento richiesto. Importo = km × tariffa.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-muted">Data viaggio</span>
          <input
            type="date"
            required
            value={form.expenseDate}
            onChange={(e) => update("expenseDate", e.target.value)}
            className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">Da</span>
          <input
            required
            value={form.routeFrom}
            onChange={(e) => update("routeFrom", e.target.value)}
            placeholder="Città / indirizzo partenza"
            className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">A</span>
          <input
            required
            value={form.routeTo}
            onChange={(e) => update("routeTo", e.target.value)}
            placeholder="Città / indirizzo destinazione"
            className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">Km</span>
          <input
            type="number"
            min="0.1"
            step="0.1"
            required
            value={form.km}
            onChange={(e) => update("km", e.target.value)}
            className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">Tariffa €/km</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={form.ratePerKm}
            onChange={(e) => update("ratePerKm", e.target.value)}
            className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-muted">
            Motivo / note (opzionale)
          </span>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Es. sopralluogo impianto cliente"
            className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
          />
        </label>
      </div>

      <div className="rounded-lg border border-brand/30 bg-brand-soft/50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Importo rimborso
        </p>
        <p className="mt-1 font-display text-2xl font-bold text-brand-deep">
          {amount != null ? formatMoney(amount) : "—"}
        </p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep disabled:opacity-60"
        >
          {saving ? "Salvataggio…" : "Conferma e invia"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => submit(false)}
          className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-brand disabled:opacity-60"
        >
          Salva bozza
        </button>
      </div>
    </form>
  );
}
