/** Validate a single chat reaction emoji (bar + expanded picker). */
export function isValidChatReactionEmoji(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const emoji = raw.trim();
  if (!emoji || emoji.length > 32) return false;
  if (/[\x00-\x1f\x7f]/.test(emoji)) return false;
  return /\p{Extended_Pictographic}/u.test(emoji);
}
