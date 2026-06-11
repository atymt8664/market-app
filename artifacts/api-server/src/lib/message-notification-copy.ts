/** Lock-screen safe display name — no email/phone/message body. */
export function sanitizeSenderNameForLockScreen(name: string): string | null {
  const trimmed = name.replace(/[\x00-\x1f\x7f]/g, "").trim();
  if (!trimmed || trimmed.length < 2) return null;
  const clipped = trimmed.length > 40 ? trimmed.slice(0, 40).trim() : trimmed;
  if (!clipped) return null;
  if (/[@]|\+?\d{8,}/.test(clipped)) return null;
  return clipped;
}

export function buildMessageReceivedCopy(senderName: string | null): {
  title: string;
  body: string;
} {
  const platform = "Souq Arab EU";
  if (senderName) {
    return {
      title: platform,
      body: `رسالة جديدة من ${senderName}`,
    };
  }
  return {
    title: platform,
    body: "رسالة جديدة — افتح المحادثة للرد.",
  };
}
