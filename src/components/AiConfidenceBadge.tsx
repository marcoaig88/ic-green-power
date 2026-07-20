/** Normalizza confidenza AI (0–1 o 0–100) in percentuale 0–100. */
export function confidencePercent(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  const pct = value > 1 ? value : value * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function toneClasses(pct: number | null) {
  if (pct == null) return "bg-bg-accent text-muted border-line";
  if (pct >= 80) return "bg-[#d9f0df] text-[#14532d] border-[#9fbfa8]";
  if (pct >= 55) return "bg-amber-50 text-amber-900 border-amber-200";
  return "bg-orange-50 text-orange-900 border-orange-200";
}

function barTone(pct: number | null) {
  if (pct == null) return "bg-muted/40";
  if (pct >= 80) return "bg-[#1f7a3a]";
  if (pct >= 55) return "bg-amber-500";
  return "bg-orange-500";
}

export function AiConfidenceBadge({
  value,
  size = "sm",
}: {
  value: number | null | undefined;
  /** `lg` = più evidente in fase di conferma nota. */
  size?: "sm" | "lg";
}) {
  const pct = confidencePercent(value);
  const tone = toneClasses(pct);

  if (size === "lg") {
    return (
      <div
        className={`rounded-xl border px-4 py-3 ${tone}`}
        title="Confidenza estrazione AI"
      >
        <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">
          Confidenza AI
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <p className="font-display text-3xl font-extrabold leading-none">
            {pct == null ? "n/d" : `${pct}%`}
          </p>
          <p className="text-sm font-semibold opacity-80">
            {pct == null
              ? "non disponibile"
              : pct >= 80
                ? "alta"
                : pct >= 55
                  ? "media"
                  : "bassa — controlla i campi"}
          </p>
        </div>
        {pct != null && (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/60">
            <div
              className={`h-full rounded-full transition-all ${barTone(pct)}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    );
  }

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

  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${tone}`}
      title="Confidenza estrazione AI"
    >
      AI {pct}%
    </span>
  );
}
