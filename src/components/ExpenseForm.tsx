"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORY_LABELS, formatMoney } from "@/lib/format";
import {
  DEFAULT_MILEAGE_RATE,
  calcMileageAmount,
  isMileageExpense,
  mileageMerchant,
} from "@/lib/mileage";
import { canApproveExpenses } from "@/lib/roles";
import { AiConfidenceBadge } from "@/components/AiConfidenceBadge";
import { CalculateDistanceButton } from "@/components/CalculateDistanceButton";

export type ExpenseFormValues = {
  id: string;
  merchant: string | null;
  amount: number | null;
  currency: string;
  expenseDate: string | null;
  vatAmount: number | null;
  vatRate: number | null;
  category: string | null;
  description: string | null;
  documentNumber: string | null;
  taxId: string | null;
  km: number | null;
  ratePerKm: number | null;
  routeFrom: string | null;
  routeTo: string | null;
  status: string;
  fileName: string | null;
  fileMimeType: string | null;
  filePath: string | null;
  aiConfidence: number | null;
  user?: { name: string };
};

type DuplicateInfo = {
  id: string;
  createdAtLabel: string;
  statusLabel: string;
};

function toDateInput(value: string | null) {
  if (!value) return "";
  const iso = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return "";
}

export function ExpenseForm({
  expense,
  canApprove = false,
  viewerRole,
  aiError,
  queue,
  homeHref = "/expenses",
}: {
  expense: ExpenseFormValues;
  /** True solo se questo utente può approvare QUESTA nota (CFO/COO). */
  canApprove?: boolean;
  /** Ruolo dell'utente loggato — i dipendenti non vedono mai Approva/Rifiuta. */
  viewerRole: string;
  aiError?: string | null;
  queue?: { ids: string[]; index: number } | null;
  /** Destinazione dopo conferma/approvazione (dashboard o elenco). */
  homeHref?: string;
}) {
  const router = useRouter();
  const mileage = isMileageExpense(expense);
  const lockedRate = expense.ratePerKm ?? DEFAULT_MILEAGE_RATE;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
  const [roundTrip, setRoundTrip] = useState(false);
  const [form, setForm] = useState({
    merchant: expense.merchant || "",
    amount: expense.amount?.toString() || "",
    currency: expense.currency || "EUR",
    expenseDate: toDateInput(expense.expenseDate),
    vatAmount: expense.vatAmount?.toString() || "",
    vatRate: expense.vatRate?.toString() || "",
    category: expense.category || (mileage ? "chilometrico" : "altro"),
    description: expense.description || "",
    documentNumber: expense.documentNumber || "",
    taxId: expense.taxId || "",
    km: expense.km?.toString() || "",
    ratePerKm: String(lockedRate),
    routeFrom: expense.routeFrom || "",
    routeTo: expense.routeTo || "",
  });

  const inQueue = Boolean(queue && queue.ids.length > 0);
  const isLastInQueue = inQueue && queue!.index >= queue!.ids.length - 1;
  const isDraft = expense.status === "draft";
  const showApprovalActions =
    canApproveExpenses(viewerRole) && canApprove && expense.status === "submitted";
  /** Bozza editabile; dopo l'invio solo chi può approvare può intervenire. */
  const canEdit = isDraft || showApprovalActions;
  /** Dipendente (o utente senza poteri di approvazione) su nota già inserita. */
  const employeeLocked = !isDraft && !showApprovalActions;
  const canCancelNote =
    isDraft ||
    expense.status === "submitted" ||
    expense.status === "rejected" ||
    (showApprovalActions && expense.status !== "approved");
  const inputClass = canEdit
    ? "w-full rounded-md border border-line bg-white/80 px-3 py-2 outline-none ring-brand focus:ring-2"
    : "w-full rounded-md border border-line bg-bg-accent/60 px-3 py-2 text-ink";

  function goHome() {
    router.push(homeHref);
    router.refresh();
  }

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    goHome();
  }

  function goNextInQueue(removedId?: string) {
    if (!queue) {
      goHome();
      return;
    }

    const remaining = removedId
      ? queue.ids.filter((id) => id !== removedId)
      : queue.ids;
    const nextIndex = removedId ? queue.index : queue.index + 1;

    if (remaining.length === 0 || nextIndex >= remaining.length) {
      goHome();
      return;
    }

    router.push(
      `/expenses/review?ids=${remaining.join(",")}&i=${removedId ? queue.index : nextIndex}`,
    );
    router.refresh();
  }

  function updateMileageFields(patch: Partial<typeof form>) {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      const km = Number(next.km);
      next.ratePerKm = String(lockedRate);
      const amount =
        next.km.trim() === "" || !Number.isFinite(km) || km <= 0
          ? null
          : calcMileageAmount(km, lockedRate);
      next.amount = amount != null ? amount.toFixed(2) : "";
      next.merchant = mileageMerchant(next.routeFrom, next.routeTo);
      next.category = "chilometrico";
      return next;
    });
  }

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    if (!canEdit) return;
    if (mileage && (key === "routeFrom" || key === "routeTo")) {
      updateMileageFields({ [key]: value, km: "" } as Partial<typeof form>);
      return;
    }
    if (mileage && key === "ratePerKm") return;
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(options?: { status?: string; advance?: boolean }) {
    if (!canEdit && options?.status !== "approved" && options?.status !== "rejected") {
      return;
    }
    setSaving(true);
    setError(null);
    setDuplicate(null);
    try {
      const res = await fetch(`/api/expenses/${expense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant: form.merchant || null,
          amount: form.amount ? Number(form.amount) : null,
          currency: form.currency || "EUR",
          expenseDate: form.expenseDate || null,
          vatAmount: mileage ? null : form.vatAmount ? Number(form.vatAmount) : null,
          vatRate: mileage ? null : form.vatRate ? Number(form.vatRate) : null,
          category: form.category || null,
          description: form.description || null,
          documentNumber: mileage ? null : form.documentNumber || null,
          taxId: mileage ? null : form.taxId || null,
          km: mileage && form.km ? Number(form.km) : mileage ? null : undefined,
          ratePerKm: mileage ? lockedRate : undefined,
          routeFrom: mileage ? form.routeFrom || null : undefined,
          routeTo: mileage ? form.routeTo || null : undefined,
          status: options?.status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.duplicate?.id) {
          setDuplicate({
            id: data.duplicate.id,
            createdAtLabel: data.duplicate.createdAtLabel,
            statusLabel: data.duplicate.statusLabel,
          });
        }
        throw new Error(data.error || "Salvataggio non riuscito");
      }

      if (options?.status === "submitted" || options?.advance) {
        if (inQueue) {
          goNextInQueue();
          return;
        }
        if (options?.status === "submitted") {
          goHome();
          return;
        }
      }

      if (options?.status === "approved" || options?.status === "rejected") {
        goHome();
        return;
      }

      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
    } finally {
      setSaving(false);
    }
  }

  async function cancel() {
    if (!canCancelNote) {
      goHome();
      return;
    }

    const ok = window.confirm(
      expense.filePath
        ? "Annullare questa nota spesa? L'allegato verrà eliminato."
        : "Annullare questa nota spesa?",
    );
    if (!ok) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/expenses/${expense.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Annullamento non riuscito");
      if (inQueue) goNextInQueue(expense.id);
      else {
        goHome();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
      setSaving(false);
    }
  }

  const fileUrl = expense.filePath
    ? `/api/files/${expense.filePath.replace(/^uploads[\\/]/, "").replace(/\\/g, "/")}`
    : null;

  return (
    <div className={`grid gap-8 ${mileage ? "" : "lg:grid-cols-[1.1fr_0.9fr]"}`}>
      <section className="space-y-4">
        <div>
          <h1 className="brand-title brand-title--ink text-3xl sm:text-4xl">
            {mileage ? "Rimborso chilometrico" : "Dettaglio spesa"}
          </h1>
          <p className="brand-subtitle brand-subtitle--ink mt-1 text-sm">
            {employeeLocked
              ? "Nota già inserita: puoi solo consultarla o annullarla."
              : mileage
                ? "Nessun documento richiesto · importo = km × tariffa"
                : "Controlla i campi estratti dall'AI e conferma prima di inviare."}
          </p>
        </div>

        {!mileage && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Confidenza AI</span>
              <AiConfidenceBadge value={expense.aiConfidence} />
            </div>
            {aiError && (
              <p className="rounded-md border border-warn/40 bg-[#fff8e8] px-3 py-2 text-sm text-warn">
                Estrazione AI non riuscita: {aiError}. Compila i campi a mano.
              </p>
            )}
          </>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {mileage ? (
            <>
              <label className="block">
                <span className="mb-1 block text-sm text-muted">Data viaggio</span>
                <input
                  type="date"
                  readOnly={!canEdit}
                  className={inputClass}
                  value={form.expenseDate}
                  onChange={(e) => update("expenseDate", e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-muted">Importo</span>
                <input
                  type="number"
                  step="0.01"
                  readOnly
                  className="w-full rounded-md border border-line bg-brand-soft/40 px-3 py-2 outline-none"
                  value={form.amount}
                />
                <span className="mt-1 block text-xs text-muted">
                  Calcolato automaticamente ({formatMoney(Number(form.amount) || 0)})
                </span>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-muted">Da</span>
                <input
                  readOnly={!canEdit}
                  className={inputClass}
                  value={form.routeFrom}
                  onChange={(e) => update("routeFrom", e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-muted">A</span>
                <input
                  readOnly={!canEdit}
                  className={inputClass}
                  value={form.routeTo}
                  onChange={(e) => update("routeTo", e.target.value)}
                />
              </label>
              {canEdit && (
                <CalculateDistanceButton
                  from={form.routeFrom}
                  to={form.routeTo}
                  roundTrip={roundTrip}
                  onRoundTripChange={(value) => {
                    setRoundTrip(value);
                    updateMileageFields({ km: "" });
                    setError(null);
                  }}
                  onError={(message) => setError(message || null)}
                  onResult={(result) => {
                    updateMileageFields({
                      km: String(result.km),
                      routeFrom: result.origin || form.routeFrom,
                      routeTo: result.destination || form.routeTo,
                    });
                    setError(null);
                  }}
                />
              )}
              <label className="block">
                <span className="mb-1 block text-sm text-muted">Km (Google Maps)</span>
                <input
                  type="text"
                  readOnly
                  value={form.km ? form.km.replace(".", ",") : ""}
                  placeholder="Usa «Calcola km con Google Maps»"
                  className="w-full rounded-md border border-line bg-bg-accent/60 px-3 py-2 text-ink"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-muted">Tariffa €/km</span>
                <input
                  type="text"
                  readOnly
                  value={lockedRate.toFixed(4).replace(".", ",")}
                  className="w-full rounded-md border border-line bg-bg-accent/60 px-3 py-2 text-ink"
                  aria-label="Tariffa chilometrica"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-muted">Motivo / note</span>
                <textarea
                  rows={3}
                  readOnly={!canEdit}
                  className={inputClass}
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                />
              </label>
            </>
          ) : (
            <>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-muted">Fornitore</span>
                <input
                  readOnly={!canEdit}
                  className={inputClass}
                  value={form.merchant}
                  onChange={(e) => update("merchant", e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-muted">Importo</span>
                <input
                  type="number"
                  step="0.01"
                  readOnly={!canEdit}
                  className={inputClass}
                  value={form.amount}
                  onChange={(e) => update("amount", e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-muted">Valuta</span>
                <input
                  readOnly={!canEdit}
                  className={inputClass}
                  value={form.currency}
                  onChange={(e) => update("currency", e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-muted">Data</span>
                <input
                  type="date"
                  readOnly={!canEdit}
                  className={inputClass}
                  value={form.expenseDate}
                  onChange={(e) => update("expenseDate", e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-muted">Categoria</span>
                <select
                  disabled={!canEdit}
                  className={inputClass}
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                >
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-muted">IVA (€)</span>
                <input
                  type="number"
                  step="0.01"
                  readOnly={!canEdit}
                  className={inputClass}
                  value={form.vatAmount}
                  onChange={(e) => update("vatAmount", e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-muted">Aliquota IVA %</span>
                <input
                  type="number"
                  step="0.01"
                  readOnly={!canEdit}
                  className={inputClass}
                  value={form.vatRate}
                  onChange={(e) => update("vatRate", e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-muted">N. documento</span>
                <input
                  readOnly={!canEdit}
                  className={inputClass}
                  value={form.documentNumber}
                  onChange={(e) => update("documentNumber", e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-muted">P.IVA / Codice fiscale</span>
                <input
                  readOnly={!canEdit}
                  className={inputClass}
                  value={form.taxId}
                  onChange={(e) => update("taxId", e.target.value)}
                  placeholder="IT12345678901"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-muted">Descrizione</span>
                <textarea
                  rows={3}
                  readOnly={!canEdit}
                  className={inputClass}
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                />
              </label>
            </>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <p>{error}</p>
            {duplicate && (
              <p className="mt-2">
                <Link
                  href={`/expenses/${duplicate.id}`}
                  className="font-semibold underline hover:text-red-900"
                >
                  Apri la nota già inserita il {duplicate.createdAtLabel} (
                  {duplicate.statusLabel}) →
                </Link>
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            disabled={saving}
            onClick={goBack}
            className="rounded-md border border-line bg-white/80 px-4 py-2 text-sm font-medium text-muted transition hover:border-brand hover:text-ink disabled:opacity-60"
          >
            Indietro
          </button>
          {isDraft && !(inQueue && !isLastInQueue) && (
            <button
              type="button"
              disabled={saving}
              onClick={() => save()}
              className="rounded-md border border-line bg-white/80 px-4 py-2 text-sm font-medium transition hover:border-brand disabled:opacity-60"
            >
              Salva bozza
            </button>
          )}
          {isDraft && (
            <button
              type="button"
              disabled={saving}
              onClick={() => save({ status: "submitted" })}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-deep disabled:opacity-60"
            >
              {inQueue
                ? isLastInQueue
                  ? "Conferma e termina"
                  : "Conferma e passa al prossimo"
                : "Conferma e invia"}
            </button>
          )}
          {isDraft && inQueue && !isLastInQueue && (
            <button
              type="button"
              disabled={saving}
              onClick={() => save({ advance: true })}
              className="rounded-md border border-line bg-white/80 px-4 py-2 text-sm font-medium transition hover:border-brand disabled:opacity-60"
            >
              Salva e passa al prossimo
            </button>
          )}
          {canCancelNote && (
            <button
              type="button"
              disabled={saving}
              onClick={cancel}
              className="rounded-md border border-danger/40 px-4 py-2 text-sm font-medium text-danger transition hover:border-danger hover:bg-[#fde8e8] disabled:opacity-60"
            >
              {inQueue && isDraft ? "Annulla questo" : "Annulla nota spese"}
            </button>
          )}
          {showApprovalActions && (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => save({ status: "approved" })}
                className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-deep disabled:opacity-60"
              >
                Approva
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => save({ status: "rejected" })}
                className="rounded-md border border-danger px-4 py-2 text-sm font-medium text-danger disabled:opacity-60"
              >
                Rifiuta
              </button>
            </>
          )}
        </div>
      </section>

      {!mileage && (
        <aside className="space-y-3">
          <h2 className="text-sm font-medium text-muted">Allegato</h2>
          <div className="overflow-hidden rounded-lg border border-line bg-white/70">
            {fileUrl && expense.fileMimeType?.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fileUrl} alt="Scontrino" className="max-h-[70vh] w-full object-contain" />
            ) : fileUrl ? (
              <iframe title="PDF" src={fileUrl} className="h-[70vh] w-full" />
            ) : (
              <p className="p-6 text-sm text-muted">Nessun file</p>
            )}
          </div>
          {expense.fileName && (
            <p className="truncate text-xs text-muted">{expense.fileName}</p>
          )}
        </aside>
      )}
    </div>
  );
}
