import { mkdir, writeFile, unlink, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import {
  getSupabaseAdmin,
  isSupabaseConfigured,
  RECEIPTS_BUCKET,
} from "./supabase";

export const UPLOAD_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "uploads");

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export function assertAllowedMime(mimeType: string) {
  const normalized = mimeType === "image/jpg" ? "image/jpeg" : mimeType;
  if (!ALLOWED_TYPES.has(normalized)) {
    throw new Error("Formato non supportato. Usa JPG, PNG, WEBP o PDF.");
  }
}

function extensionFor(mimeType: string) {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function resolveUploadMime(file: File) {
  if (file.type && file.type !== "application/octet-stream") {
    return file.type === "image/jpg" ? "image/jpeg" : file.type;
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return file.type || "";
}

export async function saveUpload(file: File) {
  const mimeType = resolveUploadMime(file);
  assertAllowedMime(mimeType);

  const ext = extensionFor(mimeType);
  const storedName = `${Date.now()}-${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const storagePath = storedName;

    const { error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload Storage fallito: ${error.message}`);
    }

    return {
      buffer,
      storedName,
      relativePath: storagePath,
      mimeType,
      originalName: file.name,
      storage: "supabase" as const,
    };
  }

  // Fallback locale (solo sviluppo senza Supabase)
  await mkdir(UPLOAD_DIR, { recursive: true });
  const absolutePath = path.join(UPLOAD_DIR, storedName);
  await writeFile(absolutePath, buffer);

  return {
    buffer,
    storedName,
    relativePath: path.join("uploads", storedName).replace(/\\/g, "/"),
    mimeType,
    originalName: file.name,
    storage: "local" as const,
  };
}

export async function deleteUpload(filePath: string | null | undefined) {
  if (!filePath) return;

  const objectName = path.basename(filePath);

  if (isSupabaseConfigured() && !filePath.startsWith("uploads/")) {
    const supabase = getSupabaseAdmin();
    await supabase.storage.from(RECEIPTS_BUCKET).remove([objectName]);
    return;
  }

  try {
    await unlink(path.join(UPLOAD_DIR, objectName));
  } catch {
    // già assente
  }
}

export async function readUpload(filePath: string) {
  const objectName = path.basename(filePath);

  if (isSupabaseConfigured() && !filePath.startsWith("uploads/")) {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .download(objectName);

    if (error || !data) {
      throw new Error(error?.message || "File non disponibile su Storage");
    }

    return Buffer.from(await data.arrayBuffer());
  }

  return readFile(path.join(UPLOAD_DIR, objectName));
}

/** URL firmato per anteprima diretta (opzionale). */
export async function getSignedFileUrl(filePath: string, expiresIn = 3600) {
  if (!isSupabaseConfigured() || filePath.startsWith("uploads/")) {
    return null;
  }

  const objectName = path.basename(filePath);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(objectName, expiresIn);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
