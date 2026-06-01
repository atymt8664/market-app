import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  type CheckoutAddressFieldErrors,
  type CheckoutBuyerAddress,
} from "./checkout-address-types";
import { ORDERS_CARD, ORDERS_SECTION_LABEL } from "./orders-page-styles";

type CheckoutAddressFormProps = {
  value: CheckoutBuyerAddress;
  errors: CheckoutAddressFieldErrors;
  onChange: (next: CheckoutBuyerAddress) => void;
};

const INPUT_CLASS =
  "w-full rounded-xl border border-primary/25 bg-[#0A0A0A] px-3 py-2.5 text-right text-sm text-foreground outline-none transition focus:border-primary/60 focus:ring-1 focus:ring-primary/30";

export function CheckoutAddressForm({ value, errors, onChange }: CheckoutAddressFormProps) {
  function setField<K extends keyof CheckoutBuyerAddress>(key: K, fieldValue: string) {
    onChange({ ...value, [key]: fieldValue });
  }

  return (
    <div className={cn(ORDERS_CARD, "space-y-3 py-4")} data-testid="p17-checkout-address-form">
      <p className={ORDERS_SECTION_LABEL}>{t("p17.commerce.checkout.address_title")}</p>
      <AddressField
        id="checkout-recipient-name"
        label={t("p17.commerce.checkout.address_name")}
        value={value.recipientName}
        error={errors.recipientName}
        onChange={(v) => setField("recipientName", v)}
      />
      <AddressField
        id="checkout-phone"
        label={t("p17.commerce.checkout.address_phone")}
        value={value.phone}
        error={errors.phone}
        onChange={(v) => setField("phone", v)}
        dir="ltr"
        inputMode="tel"
      />
      <AddressField
        id="checkout-country"
        label={t("p17.commerce.checkout.address_country")}
        value={value.countryCode}
        error={errors.countryCode}
        onChange={(v) => setField("countryCode", v.toUpperCase())}
        dir="ltr"
        maxLength={2}
      />
      <AddressField
        id="checkout-city"
        label={t("p17.commerce.checkout.address_city")}
        value={value.city}
        error={errors.city}
        onChange={(v) => setField("city", v)}
      />
      <AddressField
        id="checkout-postal"
        label={t("p17.commerce.checkout.address_postal")}
        value={value.postalCode}
        error={errors.postalCode}
        onChange={(v) => setField("postalCode", v)}
        dir="ltr"
      />
      <AddressField
        id="checkout-line1"
        label={t("p17.commerce.checkout.address_street")}
        value={value.line1}
        error={errors.line1}
        onChange={(v) => setField("line1", v)}
      />
      <AddressField
        id="checkout-line2"
        label={t("p17.commerce.checkout.address_unit")}
        value={value.line2}
        error={errors.line2}
        onChange={(v) => setField("line2", v)}
      />
    </div>
  );
}

function AddressField({
  id,
  label,
  value,
  error,
  onChange,
  dir,
  inputMode,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  dir?: "ltr" | "rtl";
  inputMode?: "tel" | "text" | "numeric";
  maxLength?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-right text-[11px] font-semibold text-zinc-400">
        {label}
      </label>
      <input
        id={id}
        type="text"
        className={cn(INPUT_CLASS, error ? "border-red-500/50" : "")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir={dir ?? "rtl"}
        inputMode={inputMode}
        maxLength={maxLength}
        autoComplete="off"
      />
      {error ? (
        <p className="mt-1 text-right text-[10px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
