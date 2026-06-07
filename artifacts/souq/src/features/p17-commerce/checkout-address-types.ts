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

/** Reuse auth profile fields as checkout defaults (P6 saved-address book deferred). */
export function buildInitialCheckoutAddressFromUser(
  user: { name?: string | null; phone?: string | null; city?: string | null } | null | undefined,
): CheckoutBuyerAddress {
  if (!user) return { ...EMPTY_CHECKOUT_ADDRESS };
  return {
    ...EMPTY_CHECKOUT_ADDRESS,
    recipientName: user.name?.trim() ?? "",
    phone: user.phone?.trim() ?? "",
    city: user.city?.trim() ?? "",
  };
}

export function hasCheckoutAddressInput(address: CheckoutBuyerAddress): boolean {
  return (
    address.recipientName.trim().length > 0 ||
    address.phone.trim().length > 0 ||
    address.city.trim().length > 0 ||
    address.postalCode.trim().length > 0 ||
    address.line1.trim().length > 0 ||
    address.line2.trim().length > 0 ||
    (address.label?.trim().length ?? 0) > 0 ||
    address.countryCode.trim().toUpperCase() !== EMPTY_CHECKOUT_ADDRESS.countryCode
  );
}

export type CheckoutAddressFieldErrors = Partial<Record<keyof CheckoutBuyerAddress, string>>;

/** P17-7A §2.3 — client-side gate before POST /api/orders (shipping only). */
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
  const city = address.city.trim();
  if (city.length < 1 || city.length > 120) {
    errors.city = t("p17.commerce.checkout.address_err_city");
  }
  const postalCode = address.postalCode.trim();
  if (postalCode.length < 1 || postalCode.length > 20) {
    errors.postalCode = t("p17.commerce.checkout.address_err_postal");
  }
  const line1 = address.line1.trim();
  if (line1.length < 1 || line1.length > 200) {
    errors.line1 = t("p17.commerce.checkout.address_err_street");
  }
  const line2 = address.line2.trim();
  if (line2.length < 1 || line2.length > 200) {
    errors.line2 = t("p17.commerce.checkout.address_err_unit");
  }
  const label = address.label?.trim() ?? "";
  if (label.length > 64) {
    errors.label = t("p17.commerce.checkout.address_err_label");
  }
  return errors;
}

export function maskPhoneForPreview(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***${digits.slice(-4)}`;
}
