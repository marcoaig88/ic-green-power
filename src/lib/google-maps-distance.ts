export type DistanceResult = {
  km: number;
  meters: number;
  durationText: string | null;
  origin: string;
  destination: string;
};

type DistanceMatrixResponse = {
  status: string;
  error_message?: string;
  origin_addresses?: string[];
  destination_addresses?: string[];
  rows?: Array<{
    elements?: Array<{
      status: string;
      distance?: { value: number; text: string };
      duration?: { value: number; text: string };
    }>;
  }>;
};

export async function fetchDrivingDistanceKm(params: {
  from: string;
  to: string;
  apiKey: string;
  roundTrip?: boolean;
}): Promise<DistanceResult> {
  const from = params.from.trim();
  const to = params.to.trim();
  if (!from || !to) {
    throw new Error("Indica partenza e destinazione");
  }

  const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
  url.searchParams.set("origins", from);
  url.searchParams.set("destinations", to);
  url.searchParams.set("mode", "driving");
  url.searchParams.set("language", "it");
  url.searchParams.set("units", "metric");
  url.searchParams.set("region", "it");
  url.searchParams.set("key", params.apiKey);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Google Maps non raggiungibile (${res.status})`);
  }

  const data = (await res.json()) as DistanceMatrixResponse;
  if (data.status !== "OK") {
    throw new Error(
      data.error_message ||
        (data.status === "REQUEST_DENIED"
          ? "Chiave Google Maps non valida o Distance Matrix non abilitata"
          : `Google Maps: ${data.status}`),
    );
  }

  const element = data.rows?.[0]?.elements?.[0];
  if (!element || element.status !== "OK" || !element.distance) {
    throw new Error(
      element?.status === "ZERO_RESULTS" || element?.status === "NOT_FOUND"
        ? "Percorso non trovato: controlla gli indirizzi"
        : `Percorso non calcolabile (${element?.status || "UNKNOWN"})`,
    );
  }

  let meters = element.distance.value;
  if (params.roundTrip) meters *= 2;

  const km = Math.round((meters / 1000) * 10) / 10;

  return {
    km,
    meters,
    durationText: element.duration?.text ?? null,
    origin: data.origin_addresses?.[0] || from,
    destination: data.destination_addresses?.[0] || to,
  };
}
