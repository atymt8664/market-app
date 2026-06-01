import { MapPin } from "lucide-react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import type { OrderBuyerAddress } from "./orders-api.types";
import { ORDERS_CARD_COMPACT, ORDERS_CARD_TITLE } from "./orders-page-styles";

type SellerDeliveryAddressCardProps = {
  address: OrderBuyerAddress;
};

export function SellerDeliveryAddressCard({ address }: SellerDeliveryAddressCardProps) {
  return (
    <div
      className={cn(ORDERS_CARD_COMPACT, "py-3")}
      data-testid="p17-order-detail-seller-delivery-address"
    >
      <div className="mb-2 flex items-center justify-end gap-2">
        <p className={ORDERS_CARD_TITLE}>{t("p17.commerce.detail.delivery_address_title")}</p>
        <MapPin className="h-4 w-4 text-primary" strokeWidth={2} aria-hidden />
      </div>
      <div className="space-y-1 text-right text-[12px] leading-relaxed text-zinc-300">
        {address.recipientName ? (
          <p>
            <span className="text-zinc-500">{t("p17.commerce.checkout.address_name")}: </span>
            {address.recipientName}
          </p>
        ) : null}
        {address.phone ? (
          <p dir="ltr" className="text-start">
            <span className="text-zinc-500">{t("p17.commerce.checkout.address_phone")}: </span>
            {address.phone}
          </p>
        ) : null}
        <p>{address.line1}</p>
        {address.line2 ? <p>{address.line2}</p> : null}
        <p>
          {address.city}
          {address.postalCode ? ` · ${address.postalCode}` : ""} · {address.countryCode}
        </p>
      </div>
    </div>
  );
}
