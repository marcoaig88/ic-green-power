/** Normalizza confidenza AI (0–1 o 0–100) in percentuale 0–100. */
export function confidencePercent(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  const pct = value > 1 ? value : value * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export function AiConfidenceBadge({ value }: { value: number | null | undefined }) {
  const pct = confidencePercent(value);
  if (pct == null) {
    return (
      <span
        className="inline-flex rounded-md bg-bg-accent px-2 py-0.5 text-xs font-medium text-muted"
        title="Confidenza AI non disponibile"
      >
        AI n/d
      </span>
    );
  }

  const tone =
    pct >= 80
      ? "bg-[#d9f0df] text-[#14532d]"
      : pct >= 55
        ? "bg-amber-50 text-amber-800"
        : "bg-orange-50 text-orange-800";

  return (
    <span
      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${tone}`}
      title="Confidenza estrazione AI"
    >
      AI {pct}%
    </span>
  );
}
