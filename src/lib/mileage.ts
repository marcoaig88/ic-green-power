/** Tariffa fissa €/km per auto privata. */
export const PRIVATE_MILEAGE_RATE = 0.3;

/** @deprecated Usare PRIVATE_MILEAGE_RATE; alias per codice esistente. */
export const DEFAULT_MILEAGE_RATE = PRIVATE_MILEAGE_RATE;

export type MileageVehicleKind = "company" | "private";

export function calcMileageAmount(km: number, ratePerKm: number) {
  if (!Number.isFinite(km) || !Number.isFinite(ratePerKm) || km < 0 || ratePerKm < 0) {
    return null;
  }
  return Math.round(km * ratePerKm * 100) / 100;
}

export function mileageMerchant(routeFrom?: string | null, routeTo?: string | null) {
  const from = (routeFrom || "").trim();
  const to = (routeTo || "").trim();
  if (from && to) return `${from} → ${to}`;
  if (from || to) return from || to;
  return "Rimborso chilometrico";
}

export function isMileageExpense(expense: {
  category?: string | null;
  km?: number | null;
  filePath?: string | null;
}) {
  return expense.category === "chilometrico" || expense.km != null;
}

export function isPrivateMileageVehicle(expense: {
  aciVehicleRateId?: string | null;
  vehicleBrand?: string | null;
}) {
  if (expense.aciVehicleRateId) return false;
  return (expense.vehicleBrand || "").toLowerCase() === "auto privata";
}
