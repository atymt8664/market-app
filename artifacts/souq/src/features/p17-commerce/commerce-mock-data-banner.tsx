import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { ORDERS_CARD_COMPACT } from "./orders-page-styles";

type CommerceMockDataBannerProps = {
  className?: string;
  testId?: string;
};

/** Shown when orders API returns mock: true — not real commerce data. */
export function CommerceMockDataBanner({
  className,
  testId = "p17-orders-mock-banner",
}: CommerceMockDataBannerProps) {
  return (
    <div
      dir="rtl"
      role="status"
      data-testid={testId}
      className={cn(
        ORDERS_CARD_COMPACT,
        "border-amber-500/35 bg-amber-950/25 py-3 text-right ring-1 ring-amber-500/20",
        className,
      )}
    >
      <p className="text-sm font-semibold text-amber-50">{t("p17.commerce.page.mock_data_banner")}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-amber-100/85">
        {t("p17.commerce.page.mock_data_body")}
      </p>
    </div>
  );
}
