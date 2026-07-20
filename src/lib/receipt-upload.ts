/** Limite sicuro sotto i 4.5MB di Vercel Functions. */
export const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

export function mimeFromName(name: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return EXT_MIME[ext] || null;
}

export function resolveFileMime(file: File): string {
  if (file.type && file.type !== "application/octet-stream") {
    if (file.type === "image/jpg") return "image/jpeg";
    return file.type;
  }
  return mimeFromName(file.name) || "";
}

export function isAllowedReceiptMime(mime: string) {
  return (
    mime === "image/jpeg" ||
    mime === "image/png" ||
    mime === "image/webp" ||
    mime === "application/pdf"
  );
}

/**
 * Ridimensiona/comprime le immagini per stare sotto il limite Vercel.
 * PDF e file già piccoli restano invariati.
 */
export async function prepareReceiptFile(file: File): Promise<File> {
  const mime = resolveFileMime(file);

  if (mime === "application/pdf") {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error(
        `${file.name}: PDF troppo grande (max ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)}MB su questo server)`,
      );
    }
    return file.type ? file : new File([file], file.name, { type: mime });
  }

  if (!mime.startsWith("image/")) {
    throw new Error(
      `${file.name}: formato non supportato (usa JPG, PNG, WEBP o PDF)`,
    );
  }

  if (mime === "image/heic" || mime === "image/heif") {
    throw new Error(
      `${file.name}: formato HEIC non supportato. Nelle impostazioni iPhone scegli «Formato più compatibile» oppure esporta in JPG.`,
    );
  }

  // Già sotto soglia: normalizza solo il MIME se manca
  if (file.size <= MAX_UPLOAD_BYTES && file.type === mime) {
    return file;
  }
  if (file.size <= MAX_UPLOAD_BYTES) {
    return new File([file], file.name, { type: mime, lastModified: file.lastModified });
  }

  const bitmap = await createImageBitmap(file);
  const maxSide = 2000;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error(`${file.name}: compressione non disponibile`);
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.85;
  let blob: Blob | null = null;
  for (let i = 0; i < 6; i += 1) {
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (blob && blob.size <= MAX_UPLOAD_BYTES) break;
    quality -= 0.12;
  }

  if (!blob || blob.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `${file.name}: troppo grande anche dopo compressione. Prova una foto a risoluzione più bassa.`,
    );
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "scontrino";
  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export async function readApiError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const data = JSON.parse(text) as { error?: string };
    if (data.error) return data.error;
  } catch {
    // risposta non JSON (es. 413 HTML di Vercel)
  }

  if (res.status === 413) {
    return "File troppo grande per il server (max ~4MB). Riprova con una foto più piccola.";
  }
  if (res.status >= 500) {
    return "Errore del server durante il caricamento. Riprova tra poco.";
  }
  if (!text) return `Errore di caricamento (${res.status})`;
  return text.slice(0, 160);
}
