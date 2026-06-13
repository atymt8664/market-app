import { motion } from "framer-motion";
import { LegalDocumentHeader } from "@/components/legal-document-header";
import { LegalContactCard, LegalSectionCard } from "@/components/legal/legal-section-card";
import {
  SETTINGS_CARD,
  SETTINGS_HUB_SUBPAGE_MAIN,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_PAGE_BG,
} from "@/components/settings-shell";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { LEGAL_CONTACT_EMAIL, TERMS_SECTIONS } from "@/lib/legal-sections-config";

export default function TermsPage() {
  const { locale } = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full flex-col ${SETTINGS_PAGE_BG}`}
      dir={dir}
    >
      <LegalDocumentHeader title={t("legal.terms.title")} />

      <div className={`${SETTINGS_HUB_SUBPAGE_MAIN} flex-1 ${SETTINGS_IMMERSIVE_BOTTOM}`}>
        <div className={SETTINGS_CARD}>
          <h2 className="text-base font-semibold text-foreground">{t("legal.terms.intro.title")}</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{t("legal.terms.intro.body")}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("legal.terms.meta.last_updated")}: 2026-06-13
          </p>
        </div>

        {TERMS_SECTIONS.map((section) => (
          <LegalSectionCard key={section.titleKey} {...section} />
        ))}

        <LegalContactCard
          titleKey="legal.terms.contact.title"
          bodyKey="legal.terms.contact.body"
          email={LEGAL_CONTACT_EMAIL}
        />
      </div>
    </motion.div>
  );
}
