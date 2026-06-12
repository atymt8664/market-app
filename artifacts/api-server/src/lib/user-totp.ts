import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";

export function generateUserTotpSecret(): string {
  return generateSecret();
}

export async function verifyUserTotpCode(secret: string, token: string): Promise<boolean> {
  const digits = String(token ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(digits)) return false;
  const result = await verify({ secret, token: digits });
  return result.valid === true;
}

export async function userTotpQrDataUrl(secret: string, accountLabel: string): Promise<string> {
  const issuer =
    String(process.env["USER_2FA_ISSUER"] ?? "Souq Arab EU").trim() || "Souq Arab EU";
  const label = accountLabel.trim() || "user";
  const uri = generateURI({ issuer, label, secret });
  return QRCode.toDataURL(uri, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 220,
    color: { dark: "#000000", light: "#ffffff" },
  });
}
