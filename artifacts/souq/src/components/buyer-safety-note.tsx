import { ShieldAlert } from "lucide-react";
import { useState } from "react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

type BuyerSafetyNoteProps = {
  /** When true, long text is collapsed with عرض المزيد / عرض أقل */
  collapsible?: boolean;
  className?: string;
};

export function BuyerSafetyNote({
  collapsible = true,
  className,
}: BuyerSafetyNoteProps) {
  const [expanded, setExpanded] = useState(false);
  const title = t("ad_detail.safety.title");
  const body = t("ad_detail.safety.body");
  const needsToggle = collapsible && body.length > 140;

  return (
    <div
      data-ad-detail-shell="safety"
      className={cn(
        "rounded-2xl border border-border/70 bg-[#0A0A0A]/40 px-3.5 py-3.5",
        "shadow-[0_0_28px_-12px_rgba(245,158,11,0.2)] ring-1 ring-inset ring-amber-500/20",
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert className="w-4 h-4 text-amber-400/95 shrink-0" />
        <h4 className="text-sm font-semibold text-amber-100/95">{title}</h4>
      </div>
      <p
        className={cn(
          "text-xs leading-relaxed text-foreground/85 text-right",
          needsToggle && !expanded && "line-clamp-2",
        )}
      >
        {body}
      </p>
      {needsToggle ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2.5 text-xs font-medium text-primary hover:underline"
        >
          {expanded ? t("ad_detail.show_less") : t("ad_detail.show_more")}
        </button>
      ) : null}
    </div>
  );
}
