import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";

export function generateTotpSecret(): string {
  return generateSecret();
}

export async function verifyTotpCode(secret: string, token: string): Promise<boolean> {
  const digits = String(token ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(digits)) return false;
  const result = await verify({ secret, token: digits });
  return result.valid === true;
}

export async function totpQrDataUrl(secret: string): Promise<string> {
  const issuer = String(process.env["ADMIN_2FA_ISSUER"] ?? "Souq Admin").trim() || "Souq Admin";
  const label = String(process.env["ADMIN_2FA_ACCOUNT_LABEL"] ?? "admin").trim() || "admin";
  const uri = generateURI({ issuer, label, secret });
  return QRCode.toDataURL(uri, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 220,
    color: { dark: "#000000", light: "#ffffff" },
  });
}
