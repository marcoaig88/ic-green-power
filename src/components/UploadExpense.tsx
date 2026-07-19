"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const ACCEPTED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MAX_FILES = 15;
const MAX_SIZE = 10 * 1024 * 1024;

export function UploadExpense() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addFiles(list: FileList | File[] | null | undefined) {
    if (!list) return;
    const incoming = Array.from(list);
    const next: File[] = [...files];
    const problems: string[] = [];

    for (const file of incoming) {
      if (next.length >= MAX_FILES) {
        problems.push(`Massimo ${MAX_FILES} file per volta.`);
        break;
      }
      if (!ACCEPTED.has(file.type)) {
        problems.push(`${file.name}: formato non supportato`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        problems.push(`${file.name}: troppo grande (max 10MB)`);
        continue;
      }
      const duplicate = next.some(
        (f) => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified,
      );
      if (!duplicate) next.push(file);
    }

    setFiles(next);
    setError(problems[0] || null);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) {
      setError("Seleziona almeno una foto o un PDF.");
      return;
    }

    setLoading(true);
    setError(null);
    setProgress({ current: 0, total: files.length });

    const ids: string[] = [];
    const failures: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        setProgress({ current: i + 1, total: files.length });
        const body = new FormData();
        body.append("file", files[i]);
        const res = await fetch("/api/expenses", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) {
          failures.push(`${files[i].name}: ${data.error || "errore"}`);
          continue;
        }
        ids.push(data.expense.id);
      }

      if (ids.length === 0) {
        throw new Error(failures[0] || "Nessun file caricato");
      }

      router.push(`/expenses/review?ids=${ids.join(",")}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
      setLoading(false);
      setProgress(null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="brand-title brand-title--ink text-3xl sm:text-4xl">Nuova nota spesa</h1>
        <p className="brand-subtitle brand-subtitle--ink mt-2 text-base">
          Puoi caricare più scontrini insieme: Gemini estrae i dati e poi li confermi uno per
          uno.
        </p>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center transition ${
          dragging
            ? "border-brand bg-brand-soft/70"
            : "border-line bg-white/60 hover:border-brand hover:bg-brand-soft/40"
        }`}
      >
        <span className="font-medium text-brand-deep">
          {dragging
            ? "Rilascia i file qui"
            : files.length > 0
              ? `${files.length} file selezionat${files.length === 1 ? "o" : "i"}`
              : "Trascina o seleziona più foto / PDF"}
        </span>
        <span className="text-sm text-muted">
          JPG, PNG, WEBP o PDF · max 10MB · fino a {MAX_FILES} file
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="sr-only"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="space-y-2 rounded-xl border border-line bg-white/80 p-3">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}`}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="truncate font-medium text-ink">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="shrink-0 text-xs font-semibold text-danger hover:underline"
              >
                Rimuovi
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={loading || files.length === 0}
        className="w-full rounded-md bg-brand px-4 py-3 font-medium text-white transition hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading && progress
          ? `Analisi AI ${progress.current}/${progress.total}…`
          : files.length > 1
            ? `Carica ed estrai ${files.length} scontrini`
            : "Carica ed estrai con AI"}
      </button>
    </form>
  );
}
