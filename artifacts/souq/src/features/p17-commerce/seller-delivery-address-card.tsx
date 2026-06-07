import { MapPin } from "lucide-react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import type { OrderBuyerAddress } from "./orders-api.types";
import { displayOrderAddressValue } from "./seller-delivery-address-display";
import { ORDERS_CARD_COMPACT, ORDERS_CARD_TITLE } from "./orders-page-styles";

type SellerDeliveryAddressCardProps = {
  address: OrderBuyerAddress;
};

type AddressFieldRowProps = {
  label: string;
  value: string;
  ltr?: boolean;
  testId?: string;
};

function AddressFieldRow({ label, value, ltr = false, testId }: AddressFieldRowProps) {
  return (
    <p
      data-testid={testId}
      className={cn(ltr && "text-start")}
      dir={ltr ? "ltr" : undefined}
    >
      <span className="text-zinc-500">{label}: </span>
      <span className="font-medium text-zinc-200">{value}</span>
    </p>
  );
}

/** P17-7A §8 — seller delivery snapshot (shipping orders only; parent gates visibility). */
export function SellerDeliveryAddressCard({ address }: SellerDeliveryAddressCardProps) {
  return (
    <div
      className={cn(ORDERS_CARD_COMPACT, "border border-primary/20 py-3")}
      data-testid="p17-order-detail-seller-delivery-address"
    >
      <div className="mb-3 flex items-center justify-end gap-2">
        <p className={ORDERS_CARD_TITLE}>{t("p17.commerce.detail.delivery_address_title")}</p>
        <MapPin className="h-4 w-4 text-primary" strokeWidth={2} aria-hidden />
      </div>
      <div className="space-y-1.5 text-right text-[12px] leading-relaxed text-zinc-300">
        <AddressFieldRow
          testId="p17-seller-address-recipient"
          label={t("p17.commerce.checkout.address_name")}
          value={displayOrderAddressValue(address.recipientName)}
        />
        <AddressFieldRow
          testId="p17-seller-address-phone"
          label={t("p17.commerce.checkout.address_phone")}
          value={displayOrderAddressValue(address.phone)}
          ltr
        />
        <AddressFieldRow
          testId="p17-seller-address-country"
          label={t("p17.commerce.checkout.address_country")}
          value={displayOrderAddressValue(address.countryCode)}
          ltr
        />
        <AddressFieldRow
          testId="p17-seller-address-city"
          label={t("p17.commerce.checkout.address_city")}
          value={displayOrderAddressValue(address.city)}
        />
        <AddressFieldRow
          testId="p17-seller-address-postal"
          label={t("p17.commerce.checkout.address_postal")}
          value={displayOrderAddressValue(address.postalCode)}
          ltr
        />
        <AddressFieldRow
          testId="p17-seller-address-street"
          label={t("p17.commerce.checkout.address_street")}
          value={displayOrderAddressValue(address.line1)}
        />
        <AddressFieldRow
          testId="p17-seller-address-unit"
          label={t("p17.commerce.checkout.address_unit")}
          value={displayOrderAddressValue(address.line2)}
        />
      </div>
    </div>
  );
}
