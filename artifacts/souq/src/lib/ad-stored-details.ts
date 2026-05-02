/**
 * Structured payload stored in `ads.details` (jsonb).
 * Versioned so we can extend without breaking older rows.
 */

export const AD_DETAILS_VERSION = 1 as const;

export type AdCategoryPath = {
  main: string;
  sub: string;
  leaf?: string;
};

export type AdStoredDetailsV1 = {
  v: typeof AD_DETAILS_VERSION;
  specs: Record<string, string>;
  categoryPath?: AdCategoryPath;
  currency?: string;
  shipping?: { ids: string[]; pickupOnly: boolean };
  directBuy?: "yes" | "no";
  promotions?: string[];
};

const RESERVED_KEYS = new Set([
  "v",
  "specs",
  "categoryPath",
  "currency",
  "shipping",
  "directBuy",
  "promotions",
]);

export type ParsedAdDetails = {
  version: number;
  specs: Record<string, string>;
  meta: {
    categoryPath?: AdCategoryPath;
    currency?: string;
    shipping?: { ids: string[]; pickupOnly: boolean };
    directBuy?: "yes" | "no";
    promotions?: string[];
  } | null;
};

export function parseStoredAdDetails(raw: unknown): ParsedAdDetails {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { version: 0, specs: {}, meta: null };
  }
  const o = raw as Record<string, unknown>;

  if (
    o.v === 1 &&
    o.specs &&
    typeof o.specs === "object" &&
    !Array.isArray(o.specs)
  ) {
    const specs = o.specs as Record<string, string>;
    return {
      version: 1,
      specs: { ...specs },
      meta: {
        categoryPath: normalizeCategoryPath(o.categoryPath),
        currency: typeof o.currency === "string" ? o.currency : undefined,
        shipping: normalizeShipping(o.shipping),
        directBuy:
          o.directBuy === "yes" || o.directBuy === "no"
            ? o.directBuy
            : undefined,
        promotions: Array.isArray(o.promotions)
          ? (o.promotions as string[]).filter((x) => typeof x === "string")
          : undefined,
      },
    };
  }

  const specs: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) {
    if (RESERVED_KEYS.has(k)) continue;
    if (typeof v === "string" && v.trim()) specs[k] = v;
  }
  return { version: 0, specs, meta: null };
}

function normalizeCategoryPath(raw: unknown): AdCategoryPath | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const p = raw as Record<string, unknown>;
  const main = typeof p.main === "string" ? p.main : "";
  const sub = typeof p.sub === "string" ? p.sub : "";
  if (!main || !sub) return undefined;
  const leaf = typeof p.leaf === "string" ? p.leaf : undefined;
  return leaf ? { main, sub, leaf } : { main, sub };
}

function normalizeShipping(
  raw: unknown,
): { ids: string[]; pickupOnly: boolean } | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const s = raw as Record<string, unknown>;
  const ids = Array.isArray(s.ids)
    ? (s.ids as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const pickupOnly = s.pickupOnly === true;
  return { ids, pickupOnly };
}

export function buildAdDetailsPayload(input: {
  specs: Record<string, string>;
  categoryPath?: AdCategoryPath | null;
  currency: string;
  shippingIds: string[];
  pickupOnly: boolean;
  directBuy: "yes" | "no";
  promotionIds: string[];
}): AdStoredDetailsV1 {
  const specs = Object.fromEntries(
    Object.entries(input.specs).filter(
      ([, v]) => typeof v === "string" && v.trim().length > 0,
    ),
  ) as Record<string, string>;

  return {
    v: AD_DETAILS_VERSION,
    specs,
    ...(input.categoryPath ? { categoryPath: input.categoryPath } : {}),
    currency: input.currency,
    shipping: { ids: input.shippingIds, pickupOnly: input.pickupOnly },
    directBuy: input.directBuy,
    promotions:
      input.promotionIds.length > 0 ? [...input.promotionIds] : undefined,
  };
}
