import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { Check, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommerceMockHeader, CheckoutWizardProgress } from "@/features/p17-commerce-mock/components/commerce-mock-header";
import { DevMockBanner } from "@/features/p17-commerce-mock/components/dev-mock-banner";
import { OrderTimeline } from "@/features/p17-commerce-mock/components/order-timeline";
import {
  MOCK_ADDRESSES,
  MOCK_PRODUCT,
  MOCK_SHIPPING_OPTIONS,
} from "@/features/p17-commerce-mock/mock-data";
import { addBuyerOrderFromCheckout } from "@/features/p17-commerce-mock/mock-session";
import { formatEuro, P17_MOCK } from "@/features/p17-commerce-mock/mock-strings";
import {
  P17_CARD,
  P17_CARD_COMPACT,
  P17_GHOST_BTN,
  P17_MAIN,
  P17_PAGE_BG,
  P17_PRIMARY_BTN,
  P17_RADIO_ROW,
  P17_RADIO_ROW_ACTIVE,
  P17_SECONDARY_BTN,
  P17_SECTION_LABEL,
} from "@/features/p17-commerce-mock/styles";
import type { CheckoutStep } from "@/features/p17-commerce-mock/types";

export default function CheckoutMockPage() {
  const [, navigate] = useLocation();
  const [, adParams] = useRoute("/dev/checkout-mock/:adId");
  const [step, setStep] = useState<CheckoutStep>("address");
  const [selectedAddressId, setSelectedAddressId] = useState(MOCK_ADDRESSES[0]?.id ?? "home");
  const [selectedShippingId, setSelectedShippingId] = useState(MOCK_SHIPPING_OPTIONS[0]?.id ?? "dhl");
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);

  const selectedAddress = MOCK_ADDRESSES.find((a) => a.id === selectedAddressId) ?? MOCK_ADDRESSES[0];
  const selectedShipping =
    MOCK_SHIPPING_OPTIONS.find((s) => s.id === selectedShippingId) ?? MOCK_SHIPPING_OPTIONS[0];
  const total = MOCK_PRODUCT.price + (selectedShipping?.cost ?? 0);
  const stepIndex = step === "address" ? 0 : step === "shipping" ? 1 : 2;
  const wizardLabels: [string, string, string] = [
    P17_MOCK.checkout.stepAddress,
    P17_MOCK.checkout.stepShipping,
    P17_MOCK.checkout.stepReview,
  ];

  function handleConfirmOrder() {
    if (!selectedAddress || !selectedShipping) return;
    const order = addBuyerOrderFromCheckout({
      shippingMethod: selectedShipping.label,
      shippingCost: selectedShipping.cost,
      addressLabel: `${selectedAddress.city}, ${selectedAddress.country}`,
    });
    setConfirmedOrderId(order.id);
    setStep("summary");
  }

  if (confirmedOrderId) {
    const orderTotal = formatEuro(total);
    return (
      <div className={P17_PAGE_BG} dir="rtl">
        <DevMockBanner />
        <CommerceMockHeader title={P17_MOCK.confirmation.title} onBack={() => navigate("/dev/orders-mock")} />
        <main className={P17_MAIN}>
          <div className={cn(P17_CARD, "text-center")}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-primary/45 bg-primary/15 shadow-[0_0_24px_-8px_hsl(var(--primary)/0.45)]">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">{P17_MOCK.confirmation.title}</h2>
            <p className="mt-2 font-mono text-sm text-primary">{confirmedOrderId}</p>
            <p className="mt-1 text-sm text-zinc-400">
              {MOCK_PRODUCT.title} — {orderTotal}
            </p>
          </div>

          <div className={P17_CARD_COMPACT}>
            <p className="text-xs font-semibold text-zinc-500">{P17_MOCK.confirmation.whatNow}</p>
            <p className="mt-1 text-sm font-medium text-foreground">{P17_MOCK.confirmation.awaitingSeller}</p>
          </div>

          <OrderTimeline activeIndex={1} />

          <div className="flex flex-col gap-2">
            <button
              type="button"
              className={P17_PRIMARY_BTN}
              onClick={() => navigate(`/dev/orders-mock/${confirmedOrderId}`)}
            >
              {P17_MOCK.confirmation.viewOrder}
            </button>
            <button type="button" className={P17_SECONDARY_BTN} disabled>
              {P17_MOCK.confirmation.chatSeller}
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={P17_PAGE_BG} dir="rtl">
      <DevMockBanner />
      <CommerceMockHeader
        title={step === "summary" ? P17_MOCK.checkout.summaryTitle : P17_MOCK.checkout.title}
        onBack={() => {
          if (step === "shipping") setStep("address");
          else if (step === "summary") setStep("shipping");
          else window.history.back();
        }}
        trailing={<span className="text-[11px] text-zinc-500">{P17_MOCK.checkout.stepOf(stepIndex + 1)}</span>}
      />
      <CheckoutWizardProgress activeStep={stepIndex as 0 | 1 | 2} labels={wizardLabels} />

      <main className={P17_MAIN}>
        {step === "address" ? (
          <>
            <p className={P17_SECTION_LABEL}>{P17_MOCK.checkout.deliveryAddress}</p>
            <div className="flex flex-col gap-2">
              {MOCK_ADDRESSES.map((address) => (
                <button
                  key={address.id}
                  type="button"
                  onClick={() => setSelectedAddressId(address.id)}
                  className={cn(
                    P17_RADIO_ROW,
                    selectedAddressId === address.id && P17_RADIO_ROW_ACTIVE,
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                      selectedAddressId === address.id ? "border-primary bg-primary/25" : "border-zinc-600",
                    )}
                  >
                    {selectedAddressId === address.id ? (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    ) : null}
                  </span>
                  <span className="flex-1 text-right">
                    <span className="block text-sm font-semibold text-foreground">{address.label}</span>
                    <span className="block text-xs text-zinc-500">
                      {address.city}, {address.country}
                    </span>
                  </span>
                  <span className={P17_GHOST_BTN}>{P17_MOCK.checkout.edit}</span>
                </button>
              ))}
              <button type="button" className={cn(P17_RADIO_ROW, "justify-center text-sm text-primary")}>
                + {P17_MOCK.checkout.addAddress}
              </button>
            </div>
            <p className="text-xs leading-relaxed text-zinc-500">{P17_MOCK.checkout.privacyNote}</p>
            <button type="button" className={P17_PRIMARY_BTN} onClick={() => setStep("shipping")}>
              {P17_MOCK.checkout.continue}
            </button>
          </>
        ) : null}

        {step === "shipping" ? (
          <>
            <p className={P17_SECTION_LABEL}>{P17_MOCK.checkout.shippingMethod}</p>
            <div className="flex flex-col gap-2">
              {MOCK_SHIPPING_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedShippingId(option.id)}
                  className={cn(
                    P17_RADIO_ROW,
                    selectedShippingId === option.id && P17_RADIO_ROW_ACTIVE,
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                      selectedShippingId === option.id ? "border-primary bg-primary/25" : "border-zinc-600",
                    )}
                  >
                    {selectedShippingId === option.id ? (
                      <span className="h-2 w-2 rounded-full bg-primary" />
                    ) : null}
                  </span>
                  <span className="flex-1 text-sm font-medium text-foreground">{option.label}</span>
                  <span className="text-sm font-semibold text-primary">
                    {option.cost === 0 ? P17_MOCK.summary.pickupFree : formatEuro(option.cost)}
                  </span>
                </button>
              ))}
            </div>

            <div className={P17_CARD_COMPACT}>
              <p className={P17_SECTION_LABEL}>{P17_MOCK.checkout.quickSummary}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">{MOCK_PRODUCT.title}</span>
                <span className="font-semibold text-foreground">{formatEuro(MOCK_PRODUCT.price)}</span>
              </div>
            </div>

            <button type="button" className={P17_PRIMARY_BTN} onClick={() => setStep("summary")}>
              {P17_MOCK.checkout.continueToReview}
            </button>
          </>
        ) : null}

        {step === "summary" ? (
          <>
            <div className={P17_CARD}>
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-[#0A0A0A] text-primary shadow-[0_0_14px_-8px_hsl(var(--primary)/0.3)]">
                  <Smartphone className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1 text-right">
                  <p className="font-semibold text-foreground">{MOCK_PRODUCT.title}</p>
                  <p className="text-xs text-zinc-500">{MOCK_PRODUCT.condition}</p>
                  <p className="mt-1 text-sm font-bold text-primary">{formatEuro(MOCK_PRODUCT.price)}</p>
                </div>
              </div>
            </div>

            <div className={P17_CARD_COMPACT}>
              <div className="space-y-2 text-sm">
                <Row label={P17_MOCK.summary.price} value={formatEuro(MOCK_PRODUCT.price)} />
                <Row
                  label={P17_MOCK.summary.shipping}
                  value={
                    selectedShipping.cost === 0
                      ? P17_MOCK.summary.pickupFree
                      : `${formatEuro(selectedShipping.cost)} (${selectedShipping.label})`
                  }
                />
                <div className="border-t border-primary/15 pt-2">
                  <Row label={P17_MOCK.summary.total} value={formatEuro(total)} bold />
                </div>
                <Row label={P17_MOCK.summary.deliveryMethod} value={selectedShipping.label} />
                <Row
                  label={P17_MOCK.summary.deliveryAddress}
                  value={`${selectedAddress.city}, ${selectedAddress.country}`}
                />
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs leading-relaxed text-primary/95">{P17_MOCK.summary.reassurance}</p>
            </div>

            <div className={P17_CARD_COMPACT}>
              <p className="mb-2 text-xs font-semibold text-zinc-400">{P17_MOCK.summary.whatNextTitle}</p>
              <ul className="space-y-1.5 text-xs leading-relaxed text-zinc-300">
                <li>• {P17_MOCK.summary.whatNext1}</li>
                <li>• {P17_MOCK.summary.whatNext2}</li>
                <li>• {P17_MOCK.summary.whatNext3}</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <button type="button" className={P17_GHOST_BTN} onClick={() => setStep("address")}>
                {P17_MOCK.summary.editAddress}
              </button>
              <button type="button" className={P17_GHOST_BTN} onClick={() => setStep("shipping")}>
                {P17_MOCK.summary.editShipping}
              </button>
            </div>

            <p className="text-center text-[11px] text-zinc-500">{P17_MOCK.checkout.notPaymentNote}</p>
            <button type="button" className={P17_PRIMARY_BTN} onClick={handleConfirmOrder}>
              {P17_MOCK.summary.confirmCta}
            </button>
          </>
        ) : null}

        {adParams?.adId ? (
          <p className="text-center text-[10px] text-zinc-600">معاينة إعلان: {adParams.adId}</p>
        ) : null}
      </main>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-zinc-500">{label}</span>
      <span className={cn("text-left", bold ? "text-base font-bold text-primary" : "text-foreground")}>
        {value}
      </span>
    </div>
  );
}
