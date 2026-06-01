export type CheckoutBuyerAddress = {
  recipientName: string;
  phone: string;
  countryCode: string;
  city: string;
  postalCode: string;
  line1: string;
  line2: string;
  label?: string;
};

export const EMPTY_CHECKOUT_ADDRESS: CheckoutBuyerAddress = {
  recipientName: "",
  phone: "",
  countryCode: "DE",
  city: "",
  postalCode: "",
  line1: "",
  line2: "",
};

export type CheckoutAddressFieldErrors = Partial<Record<keyof CheckoutBuyerAddress, string>>;

export function validateCheckoutAddress(
  address: CheckoutBuyerAddress,
  t: (key: string) => string,
): CheckoutAddressFieldErrors {
  const errors: CheckoutAddressFieldErrors = {};
  const name = address.recipientName.trim();
  if (name.length < 2 || name.length > 120) {
    errors.recipientName = t("p17.commerce.checkout.address_err_name");
  }
  const phone = address.phone.trim();
  if (phone.length < 8 || phone.length > 32) {
    errors.phone = t("p17.commerce.checkout.address_err_phone");
  }
  const country = address.countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    errors.countryCode = t("p17.commerce.checkout.address_err_country");
  }
  if (!address.city.trim()) {
    errors.city = t("p17.commerce.checkout.address_err_city");
  }
  if (!address.postalCode.trim()) {
    errors.postalCode = t("p17.commerce.checkout.address_err_postal");
  }
  if (!address.line1.trim()) {
    errors.line1 = t("p17.commerce.checkout.address_err_street");
  }
  if (!address.line2.trim()) {
    errors.line2 = t("p17.commerce.checkout.address_err_unit");
  }
  return errors;
}

export function maskPhoneForPreview(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***${digits.slice(-4)}`;
}
