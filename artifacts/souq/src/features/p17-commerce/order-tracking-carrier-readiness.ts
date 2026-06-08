/**
 * P17-8 Package 2 — Future carrier readiness (architecture only).
 * v1: label normalization + static external tracking URL templates.
 * v2 (P17-17): carrier webhooks — not implemented here.
 */

export type CarrierCode =
  | "dhl_paket"
  | "dhl_packchen"
  | "hermes_packchen"
  | "hermes_s_paket"
  | "dpd_paket"
  | "ups_paket"
  | "gls_paket"
  | "other"
  | "pickup_only"
  | "unknown";

export type CarrierProfile = {
  code: CarrierCode;
  /** Canonical display label (matches seller/ad catalog). */
  displayLabel: string;
  /** Static consumer tracking page — no API call. */
  trackingUrlTemplate: string | null;
  /** Reserved for P17-17 webhook integration. */
  webhookReady: false;
};

/** Official catalog — aligned with create-ad shipping options + pickup. */
export const P17_CARRIER_CATALOG: readonly CarrierProfile[] = [
  {
    code: "dhl_paket",
    displayLabel: "DHL Paket",
    trackingUrlTemplate: "https://www.dhl.de/de/privatkunden/dhl-sendungsverfolgung.html?piececode={tracking}",
    webhookReady: false,
  },
  {
    code: "dhl_packchen",
    displayLabel: "DHL Päckchen",
    trackingUrlTemplate: "https://www.dhl.de/de/privatkunden/dhl-sendungsverfolgung.html?piececode={tracking}",
    webhookReady: false,
  },
  {
    code: "hermes_packchen",
    displayLabel: "Hermes Päckchen",
    trackingUrlTemplate: "https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation/{tracking}",
    webhookReady: false,
  },
  {
    code: "hermes_s_paket",
    displayLabel: "Hermes S-Paket",
    trackingUrlTemplate: "https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation/{tracking}",
    webhookReady: false,
  },
  {
    code: "dpd_paket",
    displayLabel: "DPD Paket",
    trackingUrlTemplate: "https://tracking.dpd.de/status/en_US/parcel/{tracking}",
    webhookReady: false,
  },
  {
    code: "ups_paket",
    displayLabel: "UPS Paket",
    trackingUrlTemplate: "https://www.ups.com/track?tracknum={tracking}",
    webhookReady: false,
  },
  {
    code: "gls_paket",
    displayLabel: "GLS Paket",
    trackingUrlTemplate: "https://gls-group.eu/EU/en/parcel-tracking?match={tracking}",
    webhookReady: false,
  },
  {
    code: "other",
    displayLabel: "أخرى",
    trackingUrlTemplate: null,
    webhookReady: false,
  },
  {
    code: "pickup_only",
    displayLabel: "بدون شحن — استلام فقط",
    trackingUrlTemplate: null,
    webhookReady: false,
  },
] as const;

const LABEL_ALIASES: Record<string, CarrierCode> = {
  "dhl paket": "dhl_paket",
  "dhl päckchen": "dhl_packchen",
  "dhl packchen": "dhl_packchen",
  "hermes päckchen": "hermes_packchen",
  "hermes packchen": "hermes_packchen",
  "hermes s-paket": "hermes_s_paket",
  "dpd paket": "dpd_paket",
  "ups paket": "ups_paket",
  "gls paket": "gls_paket",
  dhl: "dhl_paket",
  hermes: "hermes_s_paket",
  dpd: "dpd_paket",
  ups: "ups_paket",
  gls: "gls_paket",
  other: "other",
  "أخرى": "other",
};

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase();
}

export function resolveCarrierProfile(
  carrierLabel: string | null | undefined,
  fulfillmentMode: "shipping" | "pickup",
): CarrierProfile {
  if (fulfillmentMode === "pickup") {
    return P17_CARRIER_CATALOG.find((c) => c.code === "pickup_only")!;
  }
  const raw = (carrierLabel ?? "").trim();
  if (!raw) {
    return {
      code: "unknown",
      displayLabel: raw,
      trackingUrlTemplate: null,
      webhookReady: false,
    };
  }
  const byLabel = P17_CARRIER_CATALOG.find(
    (c) => normalizeLabel(c.displayLabel) === normalizeLabel(raw),
  );
  if (byLabel) return byLabel;
  const alias = LABEL_ALIASES[normalizeLabel(raw)];
  if (alias) {
    return P17_CARRIER_CATALOG.find((c) => c.code === alias)!;
  }
  return {
    code: "other",
    displayLabel: raw,
    trackingUrlTemplate: null,
    webhookReady: false,
  };
}

/** Build external carrier page URL — no API/webhook (P17-17 future). */
export function buildCarrierTrackingUrl(
  profile: CarrierProfile,
  trackingNumber: string | null | undefined,
): string | null {
  const tracking = trackingNumber?.trim();
  if (!profile.trackingUrlTemplate || !tracking) return null;
  return profile.trackingUrlTemplate.replace("{tracking}", encodeURIComponent(tracking));
}
