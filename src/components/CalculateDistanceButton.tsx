"use client";

import { useState } from "react";

type Props = {
  from: string;
  to: string;
  roundTrip: boolean;
  onRoundTripChange: (value: boolean) => void;
  onResult: (result: {
    km: number;
    durationText: string | null;
    origin: string;
    destination: string;
  }) => void;
  onError: (message: string) => void;
};

export function CalculateDistanceButton({
  from,
  to,
  roundTrip,
  onRoundTripChange,
  onResult,
  onError,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  async function calculate() {
    setLoading(true);
    setHint(null);
    onError("");
    try {
      if (!from.trim() || !to.trim()) {
        throw new Error("Indica partenza e destinazione");
      }
      const res = await fetch("/api/mileage/distance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: from.trim(),
          to: to.trim(),
          roundTrip,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Calcolo non riuscito");

      onResult({
        km: data.km,
        durationText: data.durationText,
        origin: data.origin,
        destination: data.destination,
      });
      setHint(
        [
          `${data.km} km${roundTrip ? " (andata e ritorno)" : ""}`,
          data.durationText ? `· ${data.durationText} di guida` : null,
        ]
          .filter(Boolean)
          .join(" "),
      );
    } catch (e) {
      onError(e instanceof Error ? e.message : "Errore calcolo km");
      setHint(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sm:col-span-2 space-y-2 rounded-lg border border-line bg-white/60 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={roundTrip}
            onChange={(e) => onRoundTripChange(e.target.checked)}
            className="rounded border-line"
          />
          Andata e ritorno
        </label>
        <button
          type="button"
          disabled={loading}
          onClick={calculate}
          className="rounded-md border border-brand/40 bg-brand-soft/70 px-3 py-1.5 text-sm font-semibold text-brand-deep hover:border-brand disabled:opacity-60"
        >
          {loading ? "Calcolo…" : "Calcola km con Google Maps"}
        </button>
      </div>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}
