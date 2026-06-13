import { Link } from "wouter";
import { Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { LegalSectionCard } from "@/components/legal/legal-section-card";
import {
  SETTINGS_BACK_BUTTON,
  SETTINGS_CARD,
  SETTINGS_HEADER_BAR,
  SETTINGS_HEADER_INNER,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_MAIN_COLUMN,
  SETTINGS_PAGE_BG,
  SETTINGS_PAGE_TITLE,
} from "@/components/settings-shell";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { DELETE_ACCOUNT_SECTIONS } from "@/lib/legal-sections-config";

export default function DeleteAccountPage() {
  const { locale } = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const textAlign = locale === "ar" ? "right" : "left";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full flex-col ${SETTINGS_PAGE_BG}`}
      dir={dir}
    >
      <header className={SETTINGS_HEADER_BAR} dir={dir}>
        <div className={SETTINGS_HEADER_INNER}>
          <Link href="/" className="shrink-0">
            <button type="button" className={SETTINGS_BACK_BUTTON} aria-label="Souq Arab EU home">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em]">EU</span>
            </button>
          </Link>
          <h1 className={SETTINGS_PAGE_TITLE} style={{ textAlign }}>
            {t("legal.delete.title")}
          </h1>
        </div>
      </header>

      <div className={`${SETTINGS_MAIN_COLUMN} flex-1 ${SETTINGS_IMMERSIVE_BOTTOM}`}>
        <div className={SETTINGS_CARD}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/45 bg-red-950/35 text-red-200 shadow-[0_0_18px_-12px_rgba(248,113,113,0.55)]">
              <Trash2 className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-foreground">{t("legal.delete.intro.title")}</h2>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {t("legal.delete.meta.last_updated")}: 2026-06-13
              </p>
            </div>
          </div>
          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-muted-foreground">
            {t("legal.delete.intro.body")}
          </p>
        </div>

        {DELETE_ACCOUNT_SECTIONS.map((section) => (
          <LegalSectionCard key={section.titleKey} {...section} />
        ))}

        <p className="pt-2 pb-4 text-center text-[11px] leading-relaxed text-muted-foreground/85">
          {t("legal.delete.footer")}
        </p>
      </div>
    </motion.div>
  );
}
