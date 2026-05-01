import { ShieldAlert } from "lucide-react";
import { t } from "@/i18n";

export function BuyerSafetyNote() {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-3">
      <div className="flex items-center gap-2 mb-1.5">
        <ShieldAlert className="w-4 h-4 text-amber-400" />
        <h4 className="text-sm font-semibold">{t("ad_detail.safety.title")}</h4>
      </div>
      <p className="text-xs leading-6 text-foreground/90">
        {t("ad_detail.safety.body")}
      </p>
    </div>
  );
}
