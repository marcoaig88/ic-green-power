"use client";

import { useState } from "react";
import { UploadExpense } from "@/components/UploadExpense";
import { MileageExpenseForm } from "@/components/MileageExpenseForm";

type Mode = "receipt" | "mileage";

type Props = {
  mileageRatePerKm: number;
  vehicleLabel: string | null;
  aciVehicleRateId: string | null;
  homeHref?: string;
};

export function NewExpenseClient({
  mileageRatePerKm,
  vehicleLabel,
  aciVehicleRateId,
  homeHref = "/expenses",
}: Props) {
  const [mode, setMode] = useState<Mode>("receipt");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="brand-title brand-title--ink text-3xl sm:text-4xl">Nuova spesa</h1>
        <p className="brand-subtitle brand-subtitle--ink mt-1 text-sm">
          Carica uno scontrino oppure registra un rimborso chilometrico senza documento.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("receipt")}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
            mode === "receipt"
              ? "bg-brand text-white"
              : "border border-line bg-white/80 text-ink hover:border-brand"
          }`}
        >
          Scontrino / fattura
        </button>
        <button
          type="button"
          onClick={() => setMode("mileage")}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
            mode === "mileage"
              ? "bg-brand text-white"
              : "border border-line bg-white/80 text-ink hover:border-brand"
          }`}
        >
          Rimborso chilometrico
        </button>
      </div>

      {mode === "receipt" ? (
        <UploadExpense />
      ) : (
        <MileageExpenseForm
          ratePerKm={mileageRatePerKm}
          vehicleLabel={vehicleLabel}
          aciVehicleRateId={aciVehicleRateId}
          homeHref={homeHref}
        />
      )}
    </div>
  );
}
