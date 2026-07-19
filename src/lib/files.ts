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
  if (!ALLOWED_TYPES.has(mimeType)) {
    throw new Error("Formato non supportato. Usa JPG, PNG, WEBP o PDF.");
  }
}

function extensionFor(mimeType: string) {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export async function saveUpload(file: File) {
  assertAllowedMime(file.type);

  const ext = extensionFor(file.type);
  const storedName = `${Date.now()}-${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin();
    const storagePath = storedName;

    const { error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload Storage fallito: ${error.message}`);
    }

    return {
      buffer,
      storedName,
      relativePath: storagePath,
      mimeType: file.type,
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
    mimeType: file.type,
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
