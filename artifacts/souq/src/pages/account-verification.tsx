import { BadgeCheck, Clock3, ShieldAlert, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { AccountHeader } from "@/components/account-header";
import { useAuth } from "@/hooks/use-auth";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import {
  getAccountVerificationStatus,
  type AccountVerificationStatus,
} from "@/lib/account-verification";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  SETTINGS_ACTION_PANEL,
  SETTINGS_CARD,
  SETTINGS_CARD_COMPACT,
  SETTINGS_CARD_TITLE,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_MAIN_COLUMN,
  SETTINGS_PAGE_BG,
  SETTINGS_PRIMARY_BUTTON,
  SETTINGS_STATUS_BADGE,
} from "@/components/settings-shell";
import { cn } from "@/lib/utils";

export default function AccountVerification() {
  const { locale } = useLocale();
  const { user } = useAuth();
  const { toast } = useToast();
  const initialStatus = getAccountVerificationStatus((user as Record<string, unknown> | null) ?? null);
  const [localStatus, setLocalStatus] = useState<AccountVerificationStatus>(initialStatus);

  const status = localStatus;
  const statusLabel = t(`verification.status.${status}`);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex min-h-[100dvh] w-full flex-col ${SETTINGS_PAGE_BG}`}
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <AccountHeader title={t("verification.page_title")} />

      <div className={`${SETTINGS_MAIN_COLUMN} flex-1 pt-2 ${SETTINGS_IMMERSIVE_BOTTOM}`}>
        <section className={SETTINGS_CARD}>
          <h2 className={SETTINGS_CARD_TITLE}>{t("verification.benefits_title")}</h2>
          <p className="mt-2 text-sm leading-7 text-zinc-500">{t("verification.benefits_body")}</p>
        </section>

        <section className={SETTINGS_CARD}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
            <h3 className={cn(SETTINGS_CARD_TITLE, "text-base")}>{t("verification.current_status")}</h3>
          </div>
          <p className={cn(SETTINGS_STATUS_BADGE, "mt-3 border-primary/35 bg-primary/12 text-primary")}>
            {statusLabel}
          </p>

          {status === "unverified" && (
            <div
              className={cn(
                SETTINGS_CARD_COMPACT,
                "mt-4 space-y-3 border-primary/40 p-4 shadow-[0_0_22px_-14px_hsl(var(--primary)/0.16)]",
              )}
            >
              <p className="text-sm leading-relaxed text-zinc-500">{t("verification.unverified_desc")}</p>
              <div className={SETTINGS_ACTION_PANEL}>
                <button
                  type="button"
                  className={SETTINGS_PRIMARY_BUTTON}
                  onClick={() => {
                    setLocalStatus("pending");
                    toast({
                      title: t("verification.request_sent_title"),
                      description: t("verification.request_sent_desc"),
                    });
                  }}
                >
                  {t("verification.request_button")}
                </button>
              </div>
            </div>
          )}

          {status === "pending" && (
            <div
              className={cn(
                SETTINGS_CARD_COMPACT,
                "mt-4 flex items-start gap-2 border-amber-500/35 bg-amber-500/[0.07] p-3",
              )}
            >
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-sm text-foreground/90">{t("verification.pending_desc")}</p>
            </div>
          )}

          {status === "verified" && (
            <div
              className={cn(
                SETTINGS_CARD_COMPACT,
                "mt-4 flex items-start gap-2 border-primary/35 bg-primary/[0.08] p-3",
              )}
            >
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm text-foreground/90">{t("verification.verified_desc")}</p>
            </div>
          )}

          {status === "rejected" && (
            <div
              className={cn(
                SETTINGS_CARD_COMPACT,
                "mt-4 flex items-start gap-2 border-red-500/35 bg-red-500/10 p-3",
              )}
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-sm text-foreground/90">{t("verification.rejected_desc")}</p>
            </div>
          )}
        </section>
      </div>
    </motion.div>
  );
}
