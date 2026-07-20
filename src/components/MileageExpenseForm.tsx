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
          <div className="mt-4" aria-label={`Veicolo assegnato: ${vehicleLabel}`}>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
              Veicolo assegnato
            </p>
            <div className="mx-auto w-full max-w-md">
              <svg
                viewBox="0 0 420 180"
                className="h-auto w-full drop-shadow-sm"
                role="img"
              >
                <title>{vehicleLabel}</title>
                <ellipse cx="210" cy="162" rx="150" ry="10" fill="rgba(20,40,28,0.12)" />
                <path
                  d="M48 118c8-28 28-46 58-54l22-28c10-12 24-18 40-18h84c18 0 32 8 42 22l28 40c28 6 52 22 60 42v8c0 8-6 14-14 14H62c-8 0-14-6-14-14v-12z"
                  fill="#1f6b3a"
                />
                <path
                  d="M130 78h108c12 0 22 5 30 14l16 22H112l18-26c4-6 10-10 18-10z"
                  fill="#2f8a4e"
                />
                <path d="M138 84h42l-10 28H128l10-28z" fill="#d7ebdd" />
                <path d="M188 84h52l8 28h-68l8-28z" fill="#c5e0ce" />
                <path d="M248 84h28c6 0 12 3 16 8l8 20h-60l8-28z" fill="#d7ebdd" />
                <path
                  d="M210 112v36"
                  stroke="#144928"
                  strokeWidth="2"
                  opacity="0.25"
                />
                <rect
                  x="222"
                  y="126"
                  width="14"
                  height="4"
                  rx="2"
                  fill="#144928"
                  opacity="0.45"
                />
                <ellipse cx="78" cy="120" rx="10" ry="7" fill="#f2c14e" opacity="0.9" />
                <ellipse cx="348" cy="122" rx="8" ry="6" fill="#fff8e8" opacity="0.75" />
                <circle cx="118" cy="148" r="22" fill="#1a2e24" />
                <circle cx="118" cy="148" r="12" fill="#4f6354" />
                <circle cx="118" cy="148" r="5" fill="#dcecdc" />
                <circle cx="302" cy="148" r="22" fill="#1a2e24" />
                <circle cx="302" cy="148" r="12" fill="#4f6354" />
                <circle cx="302" cy="148" r="5" fill="#dcecdc" />
                {/* Door panel with model name */}
                <rect
                  x="148"
                  y="118"
                  width="124"
                  height="28"
                  rx="6"
                  fill="#ffffff"
                  stroke="#144928"
                  strokeWidth="1.5"
                />
                <text
                  x="210"
                  y="136"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#144928"
                  fontSize="11"
                  fontWeight="800"
                  fontFamily="var(--font-manrope), system-ui, sans-serif"
                >
                  {vehicleLabel.length > 28
                    ? `${vehicleLabel.slice(0, 26)}…`
                    : vehicleLabel}
                </text>
              </svg>
            </div>
          </div>
        ) : (
          <p className="mt-2 rounded-md border border-warn/30 bg-[#fff8e8] px-3 py-2 text-sm text-warn">
            Nessun veicolo assegnato: viene usata la tariffa aziendale. Chiedi
            all&apos;admin di associarti un&apos;auto.
          </p>
        )}
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
