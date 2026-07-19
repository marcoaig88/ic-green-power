import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const nullableNumber = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".").replace(/[^\d.-]/g, "");
    if (!normalized) return null;
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }
  return value;
}, z.number().nullable());

export const receiptSchema = z.object({
  merchant: z.string().nullable().optional().transform((v) => v ?? null),
  amount: nullableNumber.optional().transform((v) => v ?? null),
  currency: z.string().nullable().optional().transform((v) => v ?? null),
  expenseDate: z.string().nullable().optional().transform((v) => v ?? null),
  vatAmount: nullableNumber.optional().transform((v) => v ?? null),
  vatRate: nullableNumber.optional().transform((v) => v ?? null),
  category: z.string().nullable().optional().transform((v) => v ?? null),
  description: z.string().nullable().optional().transform((v) => v ?? null),
  documentNumber: z.string().nullable().optional().transform((v) => v ?? null),
  confidence: nullableNumber.optional().transform((v) => v ?? null),
});

export type ReceiptExtraction = z.infer<typeof receiptSchema>;

const EXTRACTION_PROMPT = `Sei un assistente per note spese aziendali italiane.
Analizza lo scontrino, la ricevuta o la fattura (immagine o PDF) ed estrai i dati.
Regole:
- Usa null se un campo non è leggibile.
- amount = totale da pagare (numero con punto decimale, es. 12.50).
- currency = codice ISO (es. EUR).
- expenseDate = data documento in YYYY-MM-DD.
- vatAmount = importo IVA se presente.
- vatRate = aliquota IVA percentuale (es. 22).
- category = una tra: vitto, viaggio, alloggio, trasporto, materiale, software, altro.
- description = breve riepilogo in italiano.
- confidence = stima 0-1 sulla qualità dell'estrazione.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    merchant: { type: "string", nullable: true },
    amount: { type: "number", nullable: true },
    currency: { type: "string", nullable: true },
    expenseDate: { type: "string", nullable: true },
    vatAmount: { type: "number", nullable: true },
    vatRate: { type: "number", nullable: true },
    category: { type: "string", nullable: true },
    description: { type: "string", nullable: true },
    documentNumber: { type: "string", nullable: true },
    confidence: { type: "number", nullable: true },
  },
  required: [
    "merchant",
    "amount",
    "currency",
    "expenseDate",
    "vatAmount",
    "vatRate",
    "category",
    "description",
    "documentNumber",
    "confidence",
  ],
};

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

export async function extractReceiptFromFile(params: {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}): Promise<ReceiptExtraction> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY non configurata");
  }

  if (!params.mimeType.startsWith("image/") && params.mimeType !== "application/pdf") {
    throw new Error("Formato non supportato. Usa JPG, PNG, WEBP o PDF.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const base64 = params.buffer.toString("base64");

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: `${EXTRACTION_PROMPT}\n\nFile: ${params.fileName}` },
          {
            inlineData: {
              mimeType: params.mimeType,
              data: base64,
            },
          },
        ],
      },
    ],
    config: {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      thinkingConfig: {
        thinkingLevel: "minimal",
      },
    },
  });

  const text = extractText(response);
  if (!text) {
    const blockReason = response.promptFeedback?.blockReason;
    throw new Error(
      blockReason
        ? `Gemini ha bloccato l'immagine (${blockReason})`
        : "Gemini non ha restituito testo",
    );
  }

  return parseExtraction(text);
}

function extractText(response: {
  text?: string;
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string; thought?: boolean }>;
    };
  }>;
}): string {
  if (response.text?.trim()) return response.text.trim();

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  return parts
    .filter((part) => !part.thought && part.text)
    .map((part) => part.text || "")
    .join("")
    .trim();
}

function parseExtraction(text: string): ReceiptExtraction {
  const cleaned = extractJsonObject(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("Raw AI response (JSON parse failed):", text.slice(0, 500));
    throw new Error("L'AI non ha restituito un JSON valido");
  }

  try {
    return receiptSchema.parse(parsed);
  } catch (error) {
    console.error("Raw AI response (schema failed):", parsed);
    throw new Error(
      error instanceof Error
        ? `Dati AI incompleti: ${error.message}`
        : "Dati AI incompleti",
    );
  }
}

function extractJsonObject(text: string): string {
  const withoutFences = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return withoutFences;
  }
  return withoutFences.slice(start, end + 1);
}
