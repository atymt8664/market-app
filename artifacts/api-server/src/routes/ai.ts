import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { ImproveDescriptionBody, SuggestPriceBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const openai = new OpenAI({
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
});

router.post("/ai/improve-description", async (req, res) => {
  const body = ImproveDescriptionBody.parse(req.body);
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

router.post("/ai/suggest-price", async (req, res) => {
  const body = SuggestPriceBody.parse(req.body);
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
