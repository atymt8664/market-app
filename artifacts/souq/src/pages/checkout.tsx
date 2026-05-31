import { useMemo, useState, type ReactNode } from "react";
import { Redirect, useLocation, useRoute } from "wouter";
import { ArrowRight, Loader2, Package } from "lucide-react";
import { getGetAdQueryKey, useGetAd } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { CheckoutWizardProgress } from "@/features/p17-commerce/checkout-wizard-progress";
import { isAdEligibleForBuyerOrder } from "@/features/p17-commerce/ad-eligibility";
import {
  clearCheckoutIdempotencyKey,
  getCheckoutIdempotencyKey,
} from "@/features/p17-commerce/checkout-idempotency";
import { loginRedirectForCheckout } from "@/features/p17-commerce/p17-commerce-redirect";
import { OrdersApiClientError } from "@/features/p17-commerce/orders-api-errors";
import { findActiveOrderNumberForAd } from "@/features/p17-commerce/orders-api-client";
import { useCreateBuyerOrder } from "@/features/p17-commerce/use-orders-mutations";
import { P17_BUY_NOW_BTN } from "@/features/p17-commerce/ad-detail-commerce-styles";
import {
  CREATE_AD_BACK_BTN,
  CREATE_AD_HEADER_BAR,
  CREATE_AD_HEADER_INNER,
  CREATE_AD_MAIN_COLUMN,
  ORDERS_CARD,
  ORDERS_CARD_COMPACT,
  ORDERS_GHOST_BTN,
  ORDERS_PAGE_LAYOUT_BOTTOM_CANCEL,
  ORDERS_SECTION_LABEL,
} from "@/features/p17-commerce/orders-page-styles";
import { useToast } from "@/hooks/use-toast";
import { getBuyerOrderDetailPath } from "@/features/p17-commerce/order-detail-paths";
import { isCanonicalOrderNumber } from "@/features/p17-commerce/order-detail-display";

type CheckoutStep = "fulfillment" | "summary";

export default function CheckoutPage() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/checkout/:adId");
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const createOrder = useCreateBuyerOrder();

  const adId = Number(params?.adId ?? "");
  const validAdId = Number.isFinite(adId) && adId > 0;

  const [step, setStep] = useState<CheckoutStep>("fulfillment");
  const [duplicateOrderNumber, setDuplicateOrderNumber] = useState<string | null>(null);

  const idempotencyKey = useMemo(
    () => (validAdId ? getCheckoutIdempotencyKey(adId) : ""),
    [validAdId, adId],
  );

  const adKey = getGetAdQueryKey(adId);
  const { data: ad, isLoading: adLoading, isError: adError } = useGetAd(adId, {
    query: {
      enabled: validAdId && isAuthenticated,
      queryKey: adKey,
      retry: 1,
    },
  });

  const eligibility = isAdEligibleForBuyerOrder(ad, user?.id);

  const wizardLabels: [string, string] = [
    t("p17.commerce.checkout.step_fulfillment"),
    t("p17.commerce.checkout.step_review"),
  ];
  const stepIndex = step === "fulfillment" ? 0 : 1;

  const priceDisplay = ad?.price != null ? `${ad.price} EUR` : t("ad_detail.unknown_price");

  async function handleConfirm() {
    if (!validAdId || !eligibility.eligible) return;
    setDuplicateOrderNumber(null);
    try {
      const result = await createOrder.mutateAsync({
        body: { adId, fulfillmentMode: "pickup", currency: "EUR" },
        idempotencyKey,
      });
      const num = result.order.orderNumber;
      if (result.order.id !== num || !isCanonicalOrderNumber(num)) {
        toast({
          title: t("p17.commerce.checkout.error_generic"),
          description: t("common.try_again"),
          variant: "destructive",
        });
        return;
      }
      clearCheckoutIdempotencyKey(adId);
      navigate(`/orders/created?orderNumber=${encodeURIComponent(num)}`, { replace: true });
    } catch (err) {
      if (err instanceof OrdersApiClientError) {
        if (err.code === "ORDER_DUPLICATE_ACTIVE") {
          const existing = await findActiveOrderNumberForAd(adId);
          setDuplicateOrderNumber(existing);
          return;
        }
        if (err.code === "ORDER_API_DISABLED" || err.status === 503) {
          toast({
            title: t("p17.commerce.checkout.error_api_disabled"),
            variant: "destructive",
          });
          return;
        }
        if (err.status === 403) {
          toast({
            title: t("ad_detail.own_ad"),
            variant: "destructive",
          });
          return;
        }
        if (err.status === 401) {
          navigate(loginRedirectForCheckout(adId));
          return;
        }
      }
      toast({
        title: t("p17.commerce.checkout.error_generic"),
        description: t("common.try_again"),
        variant: "destructive",
      });
    }
  }

  if (!validAdId) {
    return (
      <CheckoutShell title={t("p17.commerce.checkout.title")} onBack={() => navigate("/")}>
        <CheckoutMessageCard
          title={t("p17.commerce.checkout.ad_not_found_title")}
          body={t("p17.commerce.checkout.ad_not_found_body")}
          actionLabel={t("p17.commerce.page.empty_cta")}
          onAction={() => navigate("/")}
        />
      </CheckoutShell>
    );
  }

  if (authLoading) {
    return (
      <CheckoutShell
        title={t("p17.commerce.checkout.title")}
        onBack={() => navigate(validAdId ? `/ad/${adId}` : "/")}
        testId="p17-checkout-page"
      >
        <CheckoutLoadingState message={t("p17.commerce.checkout.loading_session")} />
      </CheckoutShell>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to={loginRedirectForCheckout(adId)} />;
  }

  if (adLoading) {
    return (
      <CheckoutShell
        title={t("p17.commerce.checkout.title")}
        onBack={() => navigate(`/ad/${adId}`)}
        testId="p17-checkout-page"
      >
        <CheckoutLoadingState message={t("p17.commerce.checkout.loading_ad")} />
      </CheckoutShell>
    );
  }

  if (adError || !ad || !eligibility.eligible) {
    const bodyKey =
      eligibility.reason === "own_ad"
        ? "ad_detail.own_ad"
        : eligibility.reason === "not_approved"
          ? "p17.commerce.checkout.ad_not_eligible"
          : "p17.commerce.checkout.ad_not_found_body";
    return (
      <CheckoutShell
        title={t("p17.commerce.checkout.title")}
        onBack={() => navigate(`/ad/${adId}`)}
      >
        <CheckoutMessageCard
          title={t("p17.commerce.checkout.ad_not_found_title")}
          body={t(bodyKey)}
          actionLabel={t("p17.commerce.checkout.back_to_ad")}
          onAction={() => navigate(`/ad/${adId}`)}
        />
      </CheckoutShell>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-[100svh] w-full flex-col bg-[#0A0A0A]",
        ORDERS_PAGE_LAYOUT_BOTTOM_CANCEL,
      )}
      dir="rtl"
      data-testid="p17-checkout-page"
    >
      <header className={CREATE_AD_HEADER_BAR}>
        <div className={CREATE_AD_HEADER_INNER}>
          <h1 className="truncate text-sm font-bold text-foreground md:text-base">
            {step === "summary"
              ? t("p17.commerce.checkout.summary_title")
              : t("p17.commerce.checkout.title")}
          </h1>
          <button
            type="button"
            onClick={() => {
              if (step === "summary") setStep("fulfillment");
              else navigate(`/ad/${adId}`);
            }}
            className={CREATE_AD_BACK_BTN}
            aria-label={t("common.back")}
          >
            <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </div>
      </header>

      <CheckoutWizardProgress activeStep={stepIndex as 0 | 1} labels={wizardLabels} />

      <main className={CREATE_AD_MAIN_COLUMN}>
        {step === "fulfillment" ? (
          <>
            <p className={ORDERS_SECTION_LABEL}>{t("p17.commerce.checkout.fulfillment_title")}</p>
            <div
              className={cn(
                ORDERS_CARD,
                "flex items-center gap-3 border-primary/40 bg-primary/5 py-4",
              )}
              data-testid="p17-checkout-pickup-option"
            >
              <Package className="h-6 w-6 shrink-0 text-primary" strokeWidth={2} />
              <div className="min-w-0 flex-1 text-right">
                <p className="text-sm font-bold text-foreground">
                  {t("p17.commerce.checkout.pickup_label")}
                </p>
                <p className="mt-0.5 text-[11px] text-zinc-400">
                  {t("p17.commerce.checkout.pickup_hint")}
                </p>
              </div>
            </div>
            <button
              type="button"
              className={cn(P17_BUY_NOW_BTN, "h-12 w-full")}
              onClick={() => setStep("summary")}
            >
              {t("p17.commerce.checkout.continue")}
            </button>
          </>
        ) : (
          <>
            <p className={ORDERS_SECTION_LABEL}>{t("p17.commerce.checkout.summary_title")}</p>
            <div className={cn(ORDERS_CARD, "py-4")} data-testid="p17-checkout-summary-card">
              <p className="text-sm font-bold text-foreground">{ad.title}</p>
              <div className="mt-3 space-y-1.5 text-right text-[12px]">
                <SummaryLine label={t("p17.commerce.checkout.line_price")} value={priceDisplay} />
                <SummaryLine
                  label={t("p17.commerce.checkout.line_fulfillment")}
                  value={t("p17.commerce.checkout.pickup_label")}
                />
                <div className="border-t border-primary/20 pt-2">
                  <SummaryLine
                    label={t("p17.commerce.checkout.line_total")}
                    value={priceDisplay}
                    highlight
                  />
                </div>
              </div>
              <p className="mt-3 text-[11px] text-primary/90">
                {t("p17.commerce.checkout.reassurance")}
              </p>
            </div>

            <div className={ORDERS_CARD_COMPACT}>
              <p className="text-xs font-semibold text-zinc-500">
                {t("p17.commerce.checkout.what_next_title")}
              </p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-[11px] text-zinc-300">
                <li>{t("p17.commerce.checkout.what_next_seller")}</li>
                <li>{t("p17.commerce.checkout.what_next_hub")}</li>
              </ul>
            </div>

            <p className="text-center text-[10px] text-zinc-500">
              {t("p17.commerce.checkout.not_payment_note")}
            </p>

            {duplicateOrderNumber ? (
              <div
                className={cn(ORDERS_CARD_COMPACT, "border-amber-500/40 bg-amber-500/10")}
                data-testid="p17-checkout-duplicate-active"
              >
                <p className="text-xs text-amber-100">{t("p17.commerce.checkout.duplicate_active")}</p>
                <button
                  type="button"
                  className={cn(P17_BUY_NOW_BTN, "mt-2 h-10 w-full text-sm")}
                  onClick={() => navigate(getBuyerOrderDetailPath(duplicateOrderNumber))}
                >
                  {t("p17.commerce.checkout.view_existing_order")}
                </button>
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <button
                type="button"
                className={cn(P17_BUY_NOW_BTN, "h-12 w-full")}
                disabled={createOrder.isPending}
                data-testid="p17-checkout-confirm"
                onClick={() => void handleConfirm()}
              >
                {createOrder.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  t("p17.commerce.checkout.confirm_cta")
                )}
              </button>
              <button
                type="button"
                className={cn(ORDERS_GHOST_BTN, "h-10 w-full text-xs")}
                onClick={() => setStep("fulfillment")}
              >
                {t("p17.commerce.checkout.edit_fulfillment")}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-zinc-500">{label}</span>
      <span className={cn("font-semibold", highlight ? "text-base text-primary" : "text-foreground")}>
        {value}
      </span>
    </div>
  );
}

function CheckoutLoadingState({ message }: { message: string }) {
  return (
    <div
      className={cn(ORDERS_CARD, "flex min-h-[50svh] flex-col items-center justify-center gap-3 py-10 text-center")}
      data-testid="p17-checkout-loading"
      aria-busy="true"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      <p className="text-sm font-medium text-foreground">{message}</p>
    </div>
  );
}

function CheckoutShell({
  title,
  onBack,
  children,
  testId,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[100svh] w-full flex-col bg-[#0A0A0A]",
        ORDERS_PAGE_LAYOUT_BOTTOM_CANCEL,
      )}
      dir="rtl"
      data-testid={testId}
    >
      <header className={CREATE_AD_HEADER_BAR}>
        <div className={CREATE_AD_HEADER_INNER}>
          <h1 className="truncate text-sm font-bold text-foreground">{title}</h1>
          <button type="button" onClick={onBack} className={CREATE_AD_BACK_BTN}>
            <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </div>
      </header>
      <main className={CREATE_AD_MAIN_COLUMN}>{children}</main>
    </div>
  );
}

function CheckoutMessageCard({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className={cn(ORDERS_CARD, "py-6 text-center")}>
      <p className="text-sm font-bold text-foreground">{title}</p>
      <p className="mt-2 text-xs text-zinc-400">{body}</p>
      <button type="button" className={cn(P17_BUY_NOW_BTN, "mx-auto mt-4 h-11 px-8")} onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}
