import { Link } from "wouter";
import { ArrowRight, BadgeCheck, Clock3, ShieldAlert, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import {
  getAccountVerificationStatus,
  type AccountVerificationStatus,
} from "@/lib/account-verification";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

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
      className="flex min-h-[100dvh] w-full flex-col bg-gradient-to-b from-background to-muted/30"
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      <header className="sticky top-0 z-40 flex items-center gap-4 border-b border-border bg-background/90 p-4 backdrop-blur">
        <Link href="/settings">
          <button
            type="button"
            className="rounded-full p-2 -mr-2 transition-all hover:bg-muted active:scale-95"
            aria-label={t("common.back")}
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </Link>
        <h1 className="font-bold text-lg">{t("verification.page_title")}</h1>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pb-8 pt-5 sm:px-6">
        <div className="rounded-2xl border border-primary/20 bg-card/70 p-5 shadow-[0_0_0_1px_rgba(182,227,86,0.05),0_12px_28px_-16px_rgba(182,227,86,0.35)]">
          <h2 className="text-base font-semibold text-foreground">{t("verification.benefits_title")}</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{t("verification.benefits_body")}</p>
        </div>

        <div className="rounded-2xl border border-border bg-background/80 p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{t("verification.current_status")}</h3>
          </div>
          <p className="mt-2 inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            {statusLabel}
          </p>

          {status === "unverified" && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">{t("verification.unverified_desc")}</p>
              <Button
                type="button"
                className="h-10 rounded-xl bg-primary text-black font-semibold"
                onClick={() => {
                  setLocalStatus("pending");
                  toast({ title: t("verification.request_sent_title"), description: t("verification.request_sent_desc") });
                }}
              >
                {t("verification.request_button")}
              </Button>
            </div>
          )}

          {status === "pending" && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <Clock3 className="mt-0.5 h-4 w-4 text-amber-400" />
              <p className="text-sm text-foreground/90">{t("verification.pending_desc")}</p>
            </div>
          )}

          {status === "verified" && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-primary/35 bg-primary/10 p-3">
              <BadgeCheck className="mt-0.5 h-4 w-4 text-primary" />
              <p className="text-sm text-foreground/90">{t("verification.verified_desc")}</p>
            </div>
          )}

          {status === "rejected" && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 text-red-400" />
              <p className="text-sm text-foreground/90">{t("verification.rejected_desc")}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

