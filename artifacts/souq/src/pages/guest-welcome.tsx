import { Link, useSearch } from "wouter";
import { ArrowRight, LogIn, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AUTH_ACCENT_GHOST_BTN,
  AUTH_ACCENT_OUTLINE_BTN,
  AUTH_BACK_BUTTON,
  AUTH_CARD,
  AUTH_CONTEXT_ALERT,
  AUTH_HEADER,
  AUTH_HERO_CARD,
  AUTH_PAGE_BG,
} from "@/lib/auth-page-styles";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";

export default function GuestWelcome() {
  const { locale } = useLocale();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const nextRaw = params.get("next") || params.get("redirect") || "/profile";
  const loginRedirectTarget = nextRaw === "/create-ad" ? "/new" : nextRaw;
  const loginHref = `/login?redirect=${encodeURIComponent(loginRedirectTarget)}`;
  const signupHref = `/signup?next=${encodeURIComponent(nextRaw)}`;
  const contextualDescription: Record<string, string> = {
    "/create-ad": t("auth.guest.context.create_ad"),
    "/messages": t("auth.guest.context.messages"),
    "/favorites": t("auth.guest.context.favorites"),
    "/profile": t("auth.guest.context.profile"),
  };
  const contextualTitle = t("auth.guest.sign_in_first");
  const contextualText = contextualDescription[nextRaw] ?? t("auth.guest.context.default");
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={AUTH_PAGE_BG}
      dir={dir}
      aria-label={t("auth.shared.welcome_brand")}
    >
      <header className={AUTH_HEADER}>
        <Link href="/">
          <button
            type="button"
            className={AUTH_BACK_BUTTON}
            aria-label={locale === "ar" ? "رجوع" : "Back"}
          >
            <ArrowRight
              className={cn("h-5 w-5", locale !== "ar" && "rotate-180")}
              strokeWidth={2.25}
            />
          </button>
        </Link>
        <div className="min-w-0 flex-1" />
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-10 pt-6 md:px-5">
        <div className="flex w-full max-w-md flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="absolute h-36 w-36 rounded-full bg-primary/15 blur-3xl" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-primary/35 bg-[#0A0A0A]/80 shadow-[0_0_24px_-12px_hsl(var(--primary)/0.35)] ring-1 ring-primary/15">
              <UserPlus className="h-11 w-11 text-primary" strokeWidth={2} />
            </div>
          </div>
          <div className={cn(AUTH_HERO_CARD, "w-full max-w-md space-y-1.5")}>
            <p className="text-base font-bold text-foreground">{t("auth.shared.welcome_brand")}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("auth.shared.welcome_desc")}</p>
          </div>
        </div>

        <div className={AUTH_CARD}>
          <div className="flex flex-col gap-3">
            <div className={AUTH_CONTEXT_ALERT}>
              <p className="text-sm font-semibold text-foreground">{contextualTitle}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{contextualText}</p>
            </div>
            <Link href={loginHref} className="w-full">
              <Button
                type="button"
                variant="ghost"
                className={cn(AUTH_ACCENT_OUTLINE_BTN, "inline-flex items-center justify-center gap-2 hover:bg-black/30")}
              >
                <LogIn className="h-4 w-4 shrink-0" />
                {t("auth.login.submit")}
              </Button>
            </Link>
            <Link href={signupHref} className="w-full">
              <Button
                type="button"
                variant="ghost"
                className={cn(AUTH_ACCENT_GHOST_BTN, "inline-flex items-center justify-center gap-2 hover:bg-black/90")}
              >
                <UserPlus className="h-4 w-4 shrink-0" />
                {t("auth.signup.submit")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
