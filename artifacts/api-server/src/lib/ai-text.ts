import OpenAI from "openai";
import { logger } from "./logger";

export type ImproveAdCopyInput = {
  title: string;
  description: string;
  category?: string;
};

export type ImproveAdCopyResult = {
  title: string;
  description: string;
};

type AiKind = "gemini" | "openai";

function resolveOpenAiApiKey(): string | undefined {
  const fromIntegration = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"]?.trim();
  const fromStandard = process.env["OPENAI_API_KEY"]?.trim();
  return fromIntegration || fromStandard || undefined;
}

function resolveOpenAiBaseUrl(): string | undefined {
  const fromIntegration = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"]?.trim();
  const fromStandard = process.env["OPENAI_BASE_URL"]?.trim();
  return fromIntegration || fromStandard || undefined;
}

function resolveGeminiApiKey(): string | undefined {
  return process.env["GEMINI_API_KEY"]?.trim() || undefined;
}

export function resolveAiKind(): AiKind | null {
  if (resolveGeminiApiKey()) return "gemini";
  if (resolveOpenAiApiKey()) return "openai";
  return null;
}

const OPENAI_CHAT_MODEL =
  process.env["OPENAI_CHAT_MODEL"]?.trim() || "gpt-4o-mini";

const GEMINI_MODEL_PRIMARY =
  process.env["GEMINI_MODEL"]?.trim() || "gemini-2.0-flash";

function geminiModelCandidates(): string[] {
  const extra = (process.env["GEMINI_FALLBACK_MODELS"]?.trim() ||
    "gemini-2.5-flash,gemini-2.5-flash-lite,gemini-flash-latest,gemini-2.0-flash-lite")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([GEMINI_MODEL_PRIMARY, ...extra])];
}

const IMPROVE_SYSTEM_PROMPT =
  "أنت مساعد لكتابة إعلانات سوق مستعمل باللغة العربية في ألمانيا. حسّن العنوان والوصف: وضوح، إيجاز، جاذبية، وصدق. لا تخترع معلومات غير موجودة. لا رموز تعبيرية. أعد JSON فقط بالشكل: {\"title\": string, \"description\": string}.";

function buildImproveUserPrompt(body: ImproveAdCopyInput): string {
  return [
    `العنوان الحالي: ${body.title}`,
    body.category ? `التصنيف: ${body.category}` : "",
    `الوصف الحالي:\n${body.description}`,
    "",
    "أعد العنوان والوصف المحسّنين بالعربية.",
  ]
    .filter((line) => line.length > 0)
    .join("\n");
}

function parseImproveJson(raw: string, fallback: ImproveAdCopyInput): ImproveAdCopyResult {
  const trimmed = raw.trim();
  const jsonSlice = trimmed.includes("{")
    ? trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1)
    : trimmed;
  try {
    const parsed = JSON.parse(jsonSlice) as {
      title?: unknown;
      description?: unknown;
    };
    const title =
      typeof parsed.title === "string" && parsed.title.trim()
        ? parsed.title.trim().slice(0, 65)
        : fallback.title.trim();
    const description =
      typeof parsed.description === "string" && parsed.description.trim()
        ? parsed.description.trim().slice(0, 4000)
        : fallback.description.trim();
    return { title, description };
  } catch {
    return {
      title: fallback.title.trim(),
      description: trimmed.length > 0 ? trimmed.slice(0, 4000) : fallback.description.trim(),
    };
  }
}

function geminiHttpStatus(err: unknown): number | null {
  const msg = err instanceof Error ? err.message : String(err);
  const m = /GEMINI_HTTP_(\d{3})/.exec(msg);
  return m ? Number(m[1]) : null;
}

function isGeminiRetryableStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503;
}

async function callGeminiOnce(
  body: ImproveAdCopyInput,
  model: string,
): Promise<ImproveAdCopyResult> {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) throw new Error("GEMINI_KEY_MISSING");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: IMPROVE_SYSTEM_PROMPT }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: buildImproveUserPrompt(body) }],
        },
      ],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 1400,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`GEMINI_HTTP_${res.status}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const text =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return parseImproveJson(text, body);
}

async function improveWithGeminiModel(
  body: ImproveAdCopyInput,
  model: string,
): Promise<ImproveAdCopyResult> {
  try {
    return await callGeminiOnce(body, model);
  } catch (firstErr) {
    const status = geminiHttpStatus(firstErr);
    logger.warn({ status, kind: "gemini", model }, "Gemini improve attempt failed");
    if (status === 429) {
      await new Promise((r) => setTimeout(r, 2500));
      try {
        return await callGeminiOnce(body, model);
      } catch (retryErr) {
        const retryStatus = geminiHttpStatus(retryErr);
        if (retryStatus) {
          logger.warn({ status: retryStatus, kind: "gemini", model }, "Gemini improve retry failed");
        }
        throw retryErr;
      }
    }
    throw firstErr;
  }
}

async function improveWithGemini(body: ImproveAdCopyInput): Promise<ImproveAdCopyResult> {
  const models = geminiModelCandidates();
  let lastErr: unknown;
  for (const model of models) {
    try {
      return await improveWithGeminiModel(body, model);
    } catch (err) {
      const status = geminiHttpStatus(err);
      if (status === 429) {
        lastErr = err;
        logger.warn({ status: 429, model, kind: "gemini" }, "Gemini model rate-limited; trying next");
        continue;
      }
      throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("GEMINI_ALL_MODELS_RATE_LIMITED");
}

function createOpenAiClient(): OpenAI | null {
  const apiKey = resolveOpenAiApiKey();
  if (!apiKey) return null;
  const baseURL = resolveOpenAiBaseUrl();
  return new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
    timeout: 45_000,
    maxRetries: 0,
  });
}

async function improveWithOpenAi(body: ImproveAdCopyInput): Promise<ImproveAdCopyResult> {
  const openai = createOpenAiClient();
  if (!openai) throw new Error("OPENAI_KEY_MISSING");

  try {
    const r = await openai.chat.completions.create({
      model: OPENAI_CHAT_MODEL,
      max_completion_tokens: 1400,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: IMPROVE_SYSTEM_PROMPT },
        { role: "user", content: buildImproveUserPrompt(body) },
      ],
    });

    const raw = r.choices[0]?.message?.content?.trim() ?? "";
    return parseImproveJson(raw, body);
  } catch (err) {
    const status =
      typeof err === "object" && err !== null && "status" in err
        ? Number((err as { status: unknown }).status)
        : null;
    logger.error(
      { status: Number.isFinite(status) ? status : null, kind: "openai" },
      "OpenAI improve request failed",
    );
    throw err;
  }
}

export async function improveAdCopy(body: ImproveAdCopyInput): Promise<ImproveAdCopyResult> {
  if (!resolveAiKind()) throw new Error("AI_UNAVAILABLE");

  if (resolveGeminiApiKey()) {
    try {
      return await improveWithGemini(body);
    } catch (geminiErr) {
      const status = geminiHttpStatus(geminiErr);
      if (resolveOpenAiApiKey() && status != null && isGeminiRetryableStatus(status)) {
        logger.info(
          { geminiStatus: status, fallback: "openai" },
          "Gemini unavailable for improve; using OpenAI fallback",
        );
        return improveWithOpenAi(body);
      }
      if (status != null) {
        logger.error({ status, kind: "gemini" }, "Gemini improve request failed");
      }
      throw geminiErr;
    }
  }

  return improveWithOpenAi(body);
}

export function logImproveError(err: unknown): void {
  const e = err as { message?: unknown; name?: unknown };
  logger.error(
    {
      scope: "improveDescription",
      aiKind: resolveAiKind(),
      aiErrorName: typeof e?.name === "string" ? e.name : null,
      aiErrorKind:
        typeof e?.message === "string" && /GEMINI_HTTP|OPENAI|timeout/i.test(e.message)
          ? "provider_request_failed"
          : "unknown",
    },
    "improveDescription failed",
  );
}
