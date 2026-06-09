import { getLocale } from "@/i18n";

export type AppTextDir = "rtl" | "ltr";

export function getAppTextDir(): AppTextDir {
  return getLocale() === "ar" ? "rtl" : "ltr";
}

/** Physical alignment from app locale only — never from peer name language. */
export function appTextAlignClass(): string {
  return getAppTextDir() === "rtl" ? "text-right" : "text-left";
}

/** Inline-start cluster for name + icons inside a row with app `dir`. */
export function appInlineStartJustifyClass(): string {
  return "justify-start";
}
