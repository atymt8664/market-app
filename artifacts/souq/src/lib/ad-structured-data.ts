/**
 * P4-1 — Ad detail JSON-LD (Product + Offer). Real ad fields only; no fabricated data.
 */
import { resolveCurrencyCode } from "@/lib/format";
import { buildCanonicalUrl } from "@/lib/seo-foundation";

export const P4_AD_STRUCTURED_DATA_SCRIPT_ID = "p4-ad-structured-data";
const DEFAULT_CURRENCY = "EUR";

export type AdStructuredDataInput = {
  id: number;
  title?: string | null;
  description?: string | null;
  price?: number | null;
  priceType?: string | null;
  type?: string | null;
  city?: string | null;
  currency?: string | null;
  images?: string[] | null;
  status?: string | null;
  categoryName?: string | null;
  sellerName?: string | null;
};

type JsonLdNode = Record<string, unknown>;

function isPublicHttpsImage(url: string): boolean {
  const trimmed = url.trim();
  return /^https:\/\//i.test(trimmed) && !/^data:/i.test(trimmed);
}

function mapOfferAvailability(status?: string | null): string {
  switch (status?.trim()) {
    case "approved":
      return "https://schema.org/InStock";
    case "hidden":
      return "https://schema.org/OutOfStock";
    case "rejected":
      return "https://schema.org/Discontinued";
    case "pending":
      return "https://schema.org/PreOrder";
    default:
      return "https://schema.org/InStock";
  }
}

function buildOfferNode(
  input: AdStructuredDataInput,
  productUrl: string,
  offerId: string,
): JsonLdNode {
  const offer: JsonLdNode = {
    "@type": "Offer",
    "@id": offerId,
    url: productUrl,
    priceCurrency: resolveCurrencyCode(input.currency ?? DEFAULT_CURRENCY),
    availability: mapOfferAvailability(input.status),
  };

  if (input.priceType === "free") {
    offer.price = "0";
  } else if (
    input.priceType !== "swap" &&
    input.price != null &&
    Number.isFinite(Number(input.price))
  ) {
    offer.price = String(Number(input.price));
  }

  const city = input.city?.trim();
  if (city) {
    offer.availableAtOrFrom = {
      "@type": "Place",
      name: city,
    };
  }

  const status = input.status?.trim();
  if (status) {
    offer.additionalProperty = {
      "@type": "PropertyValue",
      name: "listingStatus",
      value: status,
    };
  }

  const sellerName = input.sellerName?.trim();
  if (sellerName) {
    offer.seller = {
      "@type": "Person",
      name: sellerName,
    };
  }

  return offer;
}

/** Returns null when required ad fields are missing (no fabricated listing schema). */
export function buildAdStructuredDataGraph(
  input: AdStructuredDataInput,
): { "@context": "https://schema.org"; "@graph": JsonLdNode[] } | null {
  const id = input.id;
  const title = input.title?.trim();
  if (!id || !title) return null;

  const productUrl = buildCanonicalUrl(`/ad/${id}`);
  const productId = `${productUrl}#product`;
  const offerId = `${productUrl}#offer`;

  const product: JsonLdNode = {
    "@type": "Product",
    "@id": productId,
    name: title,
    url: productUrl,
    offers: buildOfferNode(input, productUrl, offerId),
  };

  const description = input.description?.trim();
  if (description) product.description = description;

  const images = (input.images ?? []).filter(isPublicHttpsImage);
  if (images.length === 1) product.image = images[0];
  else if (images.length > 1) product.image = images;

  const categoryName = input.categoryName?.trim();
  if (categoryName) product.category = categoryName;

  const listingType = input.type?.trim();
  if (listingType) {
    product.additionalProperty = {
      "@type": "PropertyValue",
      name: "listingType",
      value: listingType,
    };
  }

  return {
    "@context": "https://schema.org",
    "@graph": [product],
  };
}

export function buildAdStructuredDataJsonLd(input: AdStructuredDataInput): string | null {
  const graph = buildAdStructuredDataGraph(input);
  return graph ? JSON.stringify(graph) : null;
}

/** Inject or remove ad JSON-LD script in document head. */
export function applyAdStructuredDataJsonLd(jsonLd: string | null): () => void {
  if (typeof document === "undefined") return () => {};

  const selector = `script#${P4_AD_STRUCTURED_DATA_SCRIPT_ID}`;
  const existing = document.head.querySelector(selector);
  const hadExisting = !!existing;
  const previousContent = existing?.textContent ?? null;

  if (!jsonLd) {
    existing?.remove();
    return () => {
      if (hadExisting && previousContent) {
        const restore = document.createElement("script");
        restore.type = "application/ld+json";
        restore.id = P4_AD_STRUCTURED_DATA_SCRIPT_ID;
        restore.textContent = previousContent;
        document.head.appendChild(restore);
      }
    };
  }

  let el: HTMLScriptElement | null =
    existing instanceof HTMLScriptElement ? existing : null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = P4_AD_STRUCTURED_DATA_SCRIPT_ID;
    document.head.appendChild(el);
  }
  el.textContent = jsonLd;

  return () => {
    if (hadExisting) {
      if (previousContent) el!.textContent = previousContent;
      else el!.remove();
    } else {
      el!.remove();
    }
  };
}
