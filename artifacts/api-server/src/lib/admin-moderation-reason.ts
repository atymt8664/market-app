export const MODERATION_REASON_PRESETS = [
  "محتوى مكرر",
  "صور غير مناسبة",
  "معلومات مضللة",
  "محتوى مخالف",
  "انتهاك شروط الاستخدام",
  "بلاغ غير صحيح",
  "تم حل المشكلة",
] as const;

export type ModerationReasonContext =
  | "ad_reject"
  | "avatar_reject"
  | "verification_reject"
  | "report_reject"
  | "report_close"
  | "support_close";

const REASON_REQUIRED: ModerationReasonContext[] = [
  "ad_reject",
  "avatar_reject",
  "verification_reject",
  "report_reject",
  "report_close",
  "support_close",
];

export function isReasonRequired(context: ModerationReasonContext): boolean {
  return REASON_REQUIRED.includes(context);
}

export function parseModerationReason(
  raw: unknown,
  context: ModerationReasonContext,
): { ok: true; reason: string } | { ok: false; error: string } {
  const reason = typeof raw === "string" ? raw.trim().slice(0, 500) : "";
  if (isReasonRequired(context) && !reason) {
    return { ok: false, error: "reason is required" };
  }
  return { ok: true, reason };
}
