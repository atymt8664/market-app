import {
  Router,
  type IRouter,
  type Response,
} from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import OpenAI from "openai";
import { ImproveDescriptionBody, SuggestPriceBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { requireAuth } from "../middlewares/require-auth";

const router: IRouter = Router();
const isProduction = process.env.NODE_ENV === "production";

/** Per logged-in user (session id); falls back to IP if session missing. */
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProduction ? 12 : 80,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI_RATE_LIMIT", message: "طلبات كثيرة، انتظر قليلاً ثم أعد المحاولة" },
  keyGenerator: (req) => {
    const uid = req.session?.userId;
    if (typeof uid === "number" && uid > 0) return `ai:u:${uid}`;
    return ipKeyGenerator(req.ip ?? "");
  },
});

/** Non-empty key from integration-specific or standard OpenAI env names. */
function resolveOpenAiApiKey(): string | undefined {
  const fromIntegration = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"]?.trim();
  const fromStandard = process.env["OPENAI_API_KEY"]?.trim();
  const key = fromIntegration || fromStandard;
  return key || undefined;
}

function resolveOpenAiBaseUrl(): string | undefined {
  const fromIntegration = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"]?.trim();
  const fromStandard = process.env["OPENAI_BASE_URL"]?.trim();
  const url = fromIntegration || fromStandard;
  return url || undefined;
}

function createOpenAiClient(): OpenAI | null {
  const apiKey = resolveOpenAiApiKey();
  if (!apiKey) return null;
  const baseURL = resolveOpenAiBaseUrl();
  return new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
    /** Avoid long hangs when the model/network stalls in local dev. */
    timeout: 45_000,
    maxRetries: 0,
  });
}

const openai = createOpenAiClient();

/** Valid OpenAI chat model; override via OPENAI_CHAT_MODEL. Avoid invalid names (they surface as failed requests). */
const OPENAI_CHAT_MODEL =
  process.env["OPENAI_CHAT_MODEL"]?.trim() || "gpt-4o-mini";

if (!openai) {
  logger.info(
    "AI routes are disabled: set AI_INTEGRATIONS_OPENAI_API_KEY or OPENAI_API_KEY in the API server environment.",
  );
}

const AI_USER_MESSAGE =
  "خدمة الذكاء الاصطناعي غير متاحة حاليًا، حاول لاحقًا";

function aiUnavailable(res: Response) {
  res.status(503).json({
    error: "AI_UNAVAILABLE",
    message: AI_USER_MESSAGE,
  });
}

function aiRequestFailed(res: Response) {
  res.status(503).json({
    error: "AI_FAILED",
    message: AI_USER_MESSAGE,
  });
}

function logAiError(scope: "improveDescription" | "suggestPrice", err: unknown) {
  const e = err as {
    status?: unknown;
    code?: unknown;
    type?: unknown;
    name?: unknown;
    message?: unknown;
  };
  logger.error(
    {
      scope,
      aiErrorStatus: typeof e?.status === "number" ? e.status : null,
      aiErrorCode: typeof e?.code === "string" ? e.code : null,
      aiErrorType: typeof e?.type === "string" ? e.type : null,
      aiErrorName: typeof e?.name === "string" ? e.name : null,
      // Keep diagnostics without leaking provider messages/prompts/secrets.
      aiErrorKind:
        typeof e?.message === "string" && /invalid[_-]?api[_-]?key/i.test(e.message)
          ? "invalid_api_key"
          : "provider_request_failed",
    },
    `${scope} failed`,
  );
}

router.post("/ai/improve-description", requireAuth, aiLimiter, async (req, res) => {
  const body = ImproveDescriptionBody.parse(req.body);
  if (!openai) {
    aiUnavailable(res);
    return;
  }
  try {
    const r = await openai.chat.completions.create({
      model: OPENAI_CHAT_MODEL,
      max_completion_tokens: 1200,
      messages: [
        {
          role: "system",
          content:
            "أنت مساعد لكتابة إعلانات سوق مستعمل باللغة العربية. مهمتك تحسين وصف الإعلان: اجعله واضحًا، موجزًا، جذابًا، وصادقًا. استخدم فقرات قصيرة ونقاط عند الحاجة. لا تخترع معلومات غير موجودة. لا تستخدم رموز تعبيرية. أعد فقط الوصف المحسن دون مقدمات.",
        },
        {
          role: "user",
          content: `العنوان: ${body.title}\n${body.category ? `التصنيف: ${body.category}\n` : ""}الوصف الحالي:\n${body.description}\n\nأعد كتابة الوصف بشكل أفضل.`,
        },
      ],
    });
    const description = r.choices[0]?.message?.content?.trim() ?? body.description;
    res.json({ description });
  } catch (err) {
    logAiError("improveDescription", err);
    aiRequestFailed(res);
  }
});

router.post("/ai/suggest-price", requireAuth, aiLimiter, async (req, res) => {
  const body = SuggestPriceBody.parse(req.body);
  if (!openai) {
    aiUnavailable(res);
    return;
  }
  try {
    const r = await openai.chat.completions.create({
      model: OPENAI_CHAT_MODEL,
      max_completion_tokens: 400,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "أنت خبير تسعير للسلع المستعملة في ألمانيا. أعد كائن JSON واحدًا فقط بالشكل: {\"price\": number, \"reasoning\": string}. price باليورو وعدد صحيح معقول. reasoning جملة قصيرة بالعربية.",
        },
        {
          role: "user",
          content: `العنوان: ${body.title}\n${body.category ? `التصنيف: ${body.category}\n` : ""}${body.description ? `الوصف: ${body.description}` : ""}`,
        },
      ],
    });
    const raw = r.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { price?: number; reasoning?: string };
    res.json({
      price: typeof parsed.price === "number" ? parsed.price : 0,
      reasoning: parsed.reasoning ?? "",
    });
  } catch (err) {
    logAiError("suggestPrice", err);
    aiRequestFailed(res);
  }
});

export default router;
