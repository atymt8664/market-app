import type { MouseEvent } from "react";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type OrderNumberCopyProps = {
  orderNumber: string;
  /** Dense list card — icon-only copy control */
  compact?: boolean;
  className?: string;
  testId?: string;
};

export function OrderNumberCopy({
  orderNumber,
  compact = false,
  className,
  testId = "p17-order-number-copy",
}: OrderNumberCopyProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      toast({ title: t("p17.commerce.order_number.copy_success") });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: t("p17.commerce.order_number.copy_failed"),
        variant: "destructive",
      });
    }
  };

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center justify-end gap-1 rounded-lg border border-primary/18 bg-primary/[0.04] px-1.5 py-0.5",
        compact ? "max-w-full" : "px-2 py-1",
        className,
      )}
      data-testid={testId}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <span
        className={cn(
          "shrink-0 font-medium text-zinc-500",
          compact ? "text-[8px] md:text-[9px]" : "text-[10px] md:text-[11px]",
        )}
      >
        {t("p17.commerce.detail.order_number")}
      </span>
      <span
        className={cn(
          "min-w-0 truncate font-mono font-semibold tabular-nums text-primary",
          compact ? "text-[9px] md:text-[10px]" : "text-[11px] md:text-xs",
        )}
        dir="ltr"
        data-testid={`${testId}-value`}
      >
        {orderNumber}
      </span>
      <button
        type="button"
        className={cn(
          "inline-flex shrink-0 items-center gap-0.5 rounded-md border border-primary/35 bg-[#0A0A0A]/80 text-primary transition-colors hover:border-primary/55 hover:bg-black/90",
          compact ? "h-5 px-1 text-[8px]" : "h-6 px-1.5 text-[9px] md:text-[10px]",
        )}
        data-testid={`${testId}-btn`}
        aria-label={t("p17.commerce.order_number.copy")}
        onClick={(e) => void handleCopy(e)}
      >
        {copied ? (
          <Check className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} strokeWidth={2.5} aria-hidden />
        ) : (
          <Copy className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} strokeWidth={2.25} aria-hidden />
        )}
        <span>{t("p17.commerce.order_number.copy")}</span>
      </button>
    </div>
  );
}
