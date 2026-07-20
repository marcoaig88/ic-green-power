"use client";

import { useState } from "react";

type DistanceProps = {
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

export function CalculateDistanceButton(props: DistanceProps) {
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  async function calculate() {
    setLoading(true);
    setHint(null);
    props.onError("");
    try {
      if (!props.from.trim() || !props.to.trim()) {
        throw new Error("Indica partenza e destinazione");
      }
      const res = await fetch("/api/mileage/distance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: props.from.trim(),
          to: props.to.trim(),
          roundTrip: props.roundTrip,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Calcolo non riuscito");

      props.onResult({
        km: data.km,
        durationText: data.durationText,
        origin: data.origin,
        destination: data.destination,
      });
      setHint(
        [
          `${data.km} km${props.roundTrip ? " (andata e ritorno)" : ""}`,
          data.durationText ? `· ${data.durationText} di guida` : null,
        ]
          .filter(Boolean)
          .join(" "),
      );
    } catch (e) {
      props.onError(e instanceof Error ? e.message : "Errore calcolo km");
      setHint(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="col-span-full space-y-1.5">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={props.roundTrip}
            onChange={(e) => {
              setHint(null);
              props.onRoundTripChange(e.target.checked);
            }}
            className="rounded border-line"
          />
          Andata e ritorno
        </label>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>

      <div className="flex flex-col justify-end">
        <span className="mb-1 block text-xs font-semibold text-muted">&nbsp;</span>
        <button
          type="button"
          disabled={loading}
          onClick={calculate}
          className="w-full rounded-md border border-brand/40 bg-brand-soft/70 px-3 py-2 text-sm font-semibold text-brand-deep hover:border-brand disabled:opacity-60"
        >
          {loading ? "Calcolo…" : "Calcola km con Google Maps"}
        </button>
      </div>
    </>
  );
}
