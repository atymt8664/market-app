import {
  Router,
  type IRouter,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import OpenAI from "openai";
import { ImproveDescriptionBody, SuggestPriceBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function requireUserAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    res.status(401).json({ error: "يرجى تسجيل الدخول" });
    return;
  }
  next();
}

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
  return new OpenAI(baseURL ? { apiKey, baseURL } : { apiKey });
}

const openai = createOpenAiClient();

if (!openai) {
  logger.info(
    "AI routes are disabled: set AI_INTEGRATIONS_OPENAI_API_KEY or OPENAI_API_KEY in the API server environment.",
  );
}

function aiUnavailable(res: Response) {
  res.status(503).json({
    error: "AI_UNAVAILABLE",
    message:
      "ميزة الذكاء الاصطناعي غير مفعّلة على الخادم. لطلب التحسين أو التسعير عبر AI، أضف المفتاح في ملف بيئة الـ API: AI_INTEGRATIONS_OPENAI_API_KEY (مفضّل) أو OPENAI_API_KEY، واختياريًا عنوان القاعدة: AI_INTEGRATIONS_OPENAI_BASE_URL أو OPENAI_BASE_URL.",
  });
}

router.post("/ai/improve-description", requireUserAuth, async (req, res) => {
  const body = ImproveDescriptionBody.parse(req.body);
  if (!openai) {
    aiUnavailable(res);
    return;
  }
  try {
    const r = await openai.chat.completions.create({
      model: "gpt-5.4",
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
    logger.error({ err }, "improveDescription failed");
    res.status(502).json({ error: "AI request failed" });
  }
});

router.post("/ai/suggest-price", requireUserAuth, async (req, res) => {
  const body = SuggestPriceBody.parse(req.body);
  if (!openai) {
    aiUnavailable(res);
    return;
  }
  try {
    const r = await openai.chat.completions.create({
      model: "gpt-5.4",
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
    logger.error({ err }, "suggestPrice failed");
    res.status(502).json({ error: "AI request failed" });
  }
});

export default router;
