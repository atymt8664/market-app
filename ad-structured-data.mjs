/**
 * P4-1 — Ad JSON-LD builder (Edge / crawler shared). Keep in sync with artifacts/souq/src/lib/ad-structured-data.ts.
 */
export const P4_AD_STRUCTURED_DATA_SCRIPT_ID = "p4-ad-structured-data";
export const P4_ORIGIN = "https://www.souq-arab.com";
const DEFAULT_CURRENCY = "EUR";

function isPublicHttpsImage(url) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  return /^https:\/\//i.test(trimmed) && !/^data:/i.test(trimmed);
}

function resolveCurrencyCode(currency) {
  if (!currency || typeof currency !== "string") return DEFAULT_CURRENCY;
  const code = currency.trim().toUpperCase();
  return code || DEFAULT_CURRENCY;
}

function mapOfferAvailability(status) {
  switch (String(status || "").trim()) {
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

function buildOfferNode(input, productUrl, offerId) {
  const offer = {
    "@type": "Offer",
    "@id": offerId,
    url: productUrl,
    priceCurrency: resolveCurrencyCode(input.currency),
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

  const city = input.city ? String(input.city).trim() : "";
  if (city) {
    offer.availableAtOrFrom = { "@type": "Place", name: city };
  }

  const status = input.status ? String(input.status).trim() : "";
  if (status) {
    offer.additionalProperty = {
      "@type": "PropertyValue",
      name: "listingStatus",
      value: status,
    };
  }

  const sellerName = input.sellerName ? String(input.sellerName).trim() : "";
  if (sellerName) {
    offer.seller = { "@type": "Person", name: sellerName };
  }

  return offer;
}

export function buildAdStructuredDataGraph(ad) {
  const id = ad?.id;
  const title = ad?.title ? String(ad.title).trim() : "";
  if (!id || !title) return null;

  const productUrl = `${P4_ORIGIN}/ad/${id}`;
  const productId = `${productUrl}#product`;
  const offerId = `${productUrl}#offer`;

  const product = {
    "@type": "Product",
    "@id": productId,
    name: title,
    url: productUrl,
    offers: buildOfferNode(ad, productUrl, offerId),
  };

  const description = ad.description ? String(ad.description).trim() : "";
  if (description) product.description = description;

  const images = Array.isArray(ad.images) ? ad.images.filter(isPublicHttpsImage) : [];
  if (images.length === 1) product.image = images[0];
  else if (images.length > 1) product.image = images;

  const categoryName = ad.categoryName ? String(ad.categoryName).trim() : "";
  if (categoryName) product.category = categoryName;

  const listingType = ad.type ? String(ad.type).trim() : "";
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

export function buildAdStructuredDataJsonLd(ad) {
  const graph = buildAdStructuredDataGraph(ad);
  return graph ? JSON.stringify(graph) : null;
}
