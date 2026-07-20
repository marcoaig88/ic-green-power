"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { calcMileageAmount } from "@/lib/mileage";
import { formatMoney } from "@/lib/format";
import { CalculateDistanceButton } from "@/components/CalculateDistanceButton";

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function formatRate(rate: number) {
  return rate.toFixed(4).replace(".", ",");
}

export function MileageExpenseForm({
  ratePerKm,
  vehicleLabel,
  homeHref = "/expenses",
}: {
  ratePerKm: number;
  vehicleLabel: string | null;
  aciVehicleRateId?: string | null;
  homeHref?: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roundTrip, setRoundTrip] = useState(false);
  const [form, setForm] = useState({
    expenseDate: todayInput(),
    routeFrom: "",
    routeTo: "",
    km: "",
    description: "",
  });

  const amount = useMemo(() => {
    const km = Number(form.km);
    return calcMileageAmount(km, ratePerKm);
  }, [form.km, ratePerKm]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "routeFrom" || key === "routeTo") next.km = "";
      return next;
    });
  }

  async function submit(asSubmitted: boolean) {
    setSaving(true);
    setError(null);
    try {
      const km = Number(form.km);
      if (!form.routeFrom.trim() || !form.routeTo.trim()) {
        throw new Error("Indica partenza e destinazione");
      }
      if (!Number.isFinite(km) || km <= 0) {
        throw new Error("Calcola i chilometri con Google Maps");
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
          description: form.description.trim() || null,
          submit: asSubmitted,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Salvataggio non riuscito");

      if (asSubmitted) {
        router.push(homeHref);
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
          Km da Google Maps · tariffa dal veicolo ACI assegnato (o default aziendale).
        </p>
        {vehicleLabel ? (
          <div
            className="mt-4 flex items-center gap-3"
            aria-label={`Veicolo assegnato: ${vehicleLabel}`}
          >
            <svg
              viewBox="0 0 420 160"
              className="h-10 w-[4.5rem] shrink-0 drop-shadow-sm sm:h-11 sm:w-20"
              role="img"
              aria-hidden
            >
              <ellipse cx="210" cy="148" rx="140" ry="8" fill="rgba(20,40,28,0.08)" />
              <path
                d="M48 108c8-28 28-46 58-54l22-28c10-12 24-18 40-18h84c18 0 32 8 42 22l28 40c28 6 52 22 60 42v8c0 8-6 14-14 14H62c-8 0-14-6-14-14v-12z"
                fill="#c8e6d0"
              />
              <path
                d="M130 68h108c12 0 22 5 30 14l16 22H112l18-26c4-6 10-10 18-10z"
                fill="#dff0e4"
              />
              <path d="M138 74h42l-10 28H128l10-28z" fill="#f4faf6" />
              <path d="M188 74h52l8 28h-68l8-28z" fill="#eaf6ee" />
              <path d="M248 74h28c6 0 12 3 16 8l8 20h-60l8-28z" fill="#f4faf6" />
              <ellipse cx="78" cy="110" rx="10" ry="7" fill="#f7e7a8" opacity="0.95" />
              <ellipse cx="348" cy="112" rx="8" ry="6" fill="#ffffff" opacity="0.85" />
              <circle cx="118" cy="138" r="22" fill="#5a6f60" />
              <circle cx="118" cy="138" r="12" fill="#8a9c8e" />
              <circle cx="118" cy="138" r="5" fill="#e8f2eb" />
              <circle cx="302" cy="138" r="22" fill="#5a6f60" />
              <circle cx="302" cy="138" r="12" fill="#8a9c8e" />
              <circle cx="302" cy="138" r="5" fill="#e8f2eb" />
            </svg>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
                Veicolo assegnato
              </p>
              <p className="mt-0.5 truncate text-sm font-semibold text-brand-deep">
                {vehicleLabel}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-2 rounded-md border border-warn/30 bg-[#fff8e8] px-3 py-2 text-sm text-warn">
            Nessun veicolo assegnato: viene usata la tariffa aziendale. Chiedi
            all&apos;admin di associarti un&apos;auto.
          </p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block col-span-full">
          <span className="mb-1 block text-xs font-semibold text-muted">Data viaggio</span>
          <input
            type="date"
            required
            value={form.expenseDate}
            onChange={(e) => update("expenseDate", e.target.value)}
            className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
          />
        </label>
        <label className="block sm:col-span-1">
          <span className="mb-1 block text-xs font-semibold text-muted">Da</span>
          <input
            required
            value={form.routeFrom}
            onChange={(e) => update("routeFrom", e.target.value)}
            placeholder="Città / indirizzo partenza"
            className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-muted">A</span>
          <input
            required
            value={form.routeTo}
            onChange={(e) => update("routeTo", e.target.value)}
            placeholder="Città / indirizzo destinazione"
            className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
          />
        </label>

        <CalculateDistanceButton
          from={form.routeFrom}
          to={form.routeTo}
          roundTrip={roundTrip}
          onRoundTripChange={(value) => {
            setRoundTrip(value);
            setForm((prev) => ({ ...prev, km: "" }));
            setError(null);
          }}
          onError={(message) => setError(message || null)}
          onResult={(result) => {
            setForm((prev) => ({
              ...prev,
              km: String(result.km),
              routeFrom: result.origin || prev.routeFrom,
              routeTo: result.destination || prev.routeTo,
            }));
            setError(null);
          }}
        />

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">Km (Google Maps)</span>
          <input
            type="text"
            readOnly
            required
            value={form.km ? form.km.replace(".", ",") : ""}
            placeholder="Usa «Calcola km con Google Maps»"
            className="w-full rounded-md border border-line bg-bg-accent/60 px-3 py-2 text-sm text-ink"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">Tariffa €/km</span>
          <input
            type="text"
            readOnly
            value={formatRate(ratePerKm)}
            className="w-full rounded-md border border-line bg-bg-accent/60 px-3 py-2 text-sm text-ink"
            aria-label="Tariffa chilometrica"
          />
        </label>
        <label className="block col-span-full">
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
