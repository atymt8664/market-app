import { t } from "@/i18n";
import { cn } from "@/lib/utils";

export function CommerceComingSoonBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full border border-zinc-600/55 bg-zinc-900/90 px-2 py-0.5 text-[10px] font-semibold text-zinc-400",
        className,
      )}
    >
      {t("p17.commerce.coming_soon.badge")}
    </span>
  );
}

export function CommercePreviewBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full border border-primary/35 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary",
        className,
      )}
    >
      {t("p17.commerce.page.entry_preview_badge")}
    </span>
  );
}
