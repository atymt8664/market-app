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
import { LEGAL_CONTACT_EMAIL, PRIVACY_SECTIONS } from "@/lib/legal-sections-config";

export default function PrivacyPage() {
  const { locale } = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full flex-col ${SETTINGS_PAGE_BG}`}
      dir={dir}
    >
      <LegalDocumentHeader title={t("legal.privacy.title")} />

      <div className={`${SETTINGS_HUB_SUBPAGE_MAIN} flex-1 ${SETTINGS_IMMERSIVE_BOTTOM}`}>
        <div className={SETTINGS_CARD}>
          <h2 className="text-base font-semibold text-foreground">{t("legal.privacy.intro.title")}</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{t("legal.privacy.intro.body")}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("legal.privacy.meta.last_updated")}: 2026-06-13
          </p>
        </div>

        {PRIVACY_SECTIONS.map((section) => (
          <LegalSectionCard key={section.titleKey} {...section} />
        ))}

        <LegalContactCard
          titleKey="legal.privacy.contact.title"
          bodyKey="legal.privacy.contact.body"
          email={LEGAL_CONTACT_EMAIL}
        />
      </div>
    </motion.div>
  );
}
