"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";

export type AciVehicleOption = {
  id: string;
  year: number;
  brand: string;
  model: string;
  fuelType: string;
  production: string;
  ratePerKm: number;
  vehicleType: string;
};

type Props = {
  value: string | null;
  onChange: (vehicle: AciVehicleOption | null) => void;
  selectedLabel?: string | null;
};

const FUEL_LABELS: Record<string, string> = {
  benzina: "Benzina",
  gasolio: "Gasolio",
  gpl: "GPL",
  metano: "Metano",
  ibrido_benzina: "Ibrido benzina",
  ibrido_gasolio: "Ibrido gasolio",
  plug_in: "Plug-in",
  elettrico: "Elettrico",
  altro: "Altro",
};

export function AciVehiclePicker({ value, onChange, selectedLabel }: Props) {
  const [q, setQ] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [brand, setBrand] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [brands, setBrands] = useState<string[]>([]);
  const [fuelTypes, setFuelTypes] = useState<string[]>([]);
  const [vehicles, setVehicles] = useState<AciVehicleOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (fuelType) params.set("fuelType", fuelType);
        if (brand) params.set("brand", brand);
        params.set("limit", "50");
        const res = await fetch(`/api/aci/vehicles?${params}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Caricamento veicoli fallito");
        setYear(data.year);
        setBrands(data.brands || []);
        setFuelTypes(data.fuelTypes || []);
        setVehicles(data.vehicles || []);
        if (!data.year) {
          setError("Nessuna tabella ACI importata. Importa prima un CSV.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Errore");
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [q, fuelType, brand]);

  return (
    <div className="space-y-3 rounded-lg border border-line bg-white/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">Veicolo ACI</p>
        {year && <p className="text-xs text-muted">Tabelle {year}</p>}
      </div>

      {selectedLabel && value && (
        <p className="rounded-md bg-brand-soft/60 px-3 py-2 text-sm text-brand-deep">
          Selezionato: {selectedLabel}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="block sm:col-span-3">
          <span className="mb-1 block text-xs font-semibold text-muted">Cerca</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Marca o modello"
            className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">Alimentazione</span>
          <select
            value={fuelType}
            onChange={(e) => {
              setFuelType(e.target.value);
              setBrand("");
            }}
            className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
          >
            <option value="">Tutte</option>
            {fuelTypes.map((f) => (
              <option key={f} value={f}>
                {FUEL_LABELS[f] || f}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-muted">Marca</span>
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
          >
            <option value="">Tutte</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {loading && <p className="text-xs text-muted">Caricamento…</p>}

      <ul className="max-h-56 overflow-y-auto divide-y divide-line/70 rounded-md border border-line">
        {vehicles.length === 0 && !loading ? (
          <li className="px-3 py-4 text-sm text-muted">Nessun veicolo trovato.</li>
        ) : (
          vehicles.map((v) => {
            const active = value === v.id;
            return (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => onChange(active ? null : v)}
                  className={`flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left text-sm transition ${
                    active ? "bg-brand-soft/70" : "hover:bg-bg-accent/50"
                  }`}
                >
                  <span>
                    <span className="font-semibold text-ink">
                      {v.brand} {v.model}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {FUEL_LABELS[v.fuelType] || v.fuelType} · {v.production.replace("_", " ")}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold text-brand-deep">
                    {formatMoney(v.ratePerKm)}/km
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>

      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs font-semibold text-muted hover:text-brand"
        >
          Rimuovi veicolo
        </button>
      )}
    </div>
  );
}
