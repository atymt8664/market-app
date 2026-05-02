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
  /** قديم: كان يُحفَظ مع JSON مسطح فيتسرّب إلى specs كصف وهمي */
  "selectedCurrency",
  "shipping",
  "directBuy",
  "promotions",
  /** لا تُدمَج في specs — حقول تقنية/شحن/تصنيف */
  "pickupOnly",
  "pickup_only",
  "delivery",
  "category",
  "saleType",
  "sale_type",
]);

/** تحويل قيم المواصفات من JSON (نص/رقم/منطقي) إلى نص عرض آمن */
function coerceSpecValue(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v === "string") {
    const t = v.trim();
    return t.length > 0 ? t : null;
  }
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "boolean") return v ? "نعم" : "لا";
  return null;
}

function normalizeSpecsRecord(raw: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const s = coerceSpecValue(v);
    if (s) out[k] = s;
  }
  return out;
}

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
    const specs = stripTechnicalSpecKeys(
      normalizeSpecsRecord(o.specs as Record<string, unknown>),
    );
    return {
      version: 1,
      specs,
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
  /** دمج specs متداخل حتى لو كان الشكل غير v=1 (بيانات قديمة/مختلطة) */
  if (o.specs && typeof o.specs === "object" && !Array.isArray(o.specs)) {
    Object.assign(
      specs,
      stripTechnicalSpecKeys(
        normalizeSpecsRecord(o.specs as Record<string, unknown>),
      ),
    );
  }
  for (const [k, v] of Object.entries(o)) {
    if (RESERVED_KEYS.has(k)) continue;
    if (k === "specs") continue;
    const s = coerceSpecValue(v);
    if (s) specs[k] = s;
  }
  return { version: 0, specs: stripTechnicalSpecKeys(specs), meta: null };
}

/** مفاتيح قد تتسرّب إلى specs من بيانات قديمة/خاطئة — لا تُعرض كمواصفات جهاز */
const TECHNICAL_SPEC_KEY_NORMALIZED = new Set([
  "pickuponly",
  "pickup_only",
  "selectedcurrency",
  "selected_currency",
  "shipping",
  "delivery",
  "category",
  "saletype",
  "sale_type",
]);

function stripTechnicalSpecKeys(specs: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(specs)) {
    const nk = k.trim().toLowerCase().replace(/-/g, "_");
    if (TECHNICAL_SPEC_KEY_NORMALIZED.has(nk)) continue;
    out[k] = v;
  }
  return out;
}

/** مفاتيح لا تُستخدم أبداً في قسم «معلومات الجهاز» */
const BLOCKED_DEVICE_INFO_KEYS = new Set([
  "pickuponly",
  "pickup_only",
  "selectedcurrency",
  "selected_currency",
  "currency",
  "shipping",
  "delivery",
  "category",
  "saletype",
  "sale_type",
  "price",
  "title",
  "description",
]);

function normalizeDetailKey(k: string): string {
  return k.trim().toLowerCase().replace(/-/g, "_");
}

/**
 * فتحات عرض «معلومات الجهاز» — ترتيب العرض ثابت.
 * كل فتحة تقبل عدة أسماء مفاتيح (specs أو جذر details أو JSON مسطح قديم).
 */
const DEVICE_INFO_SLOTS_ORDER = [
  "manufacturer",
  "color",
  "condition",
  "storage",
  "accessories",
] as const;

type DeviceInfoSlot = (typeof DEVICE_INFO_SLOTS_ORDER)[number];

const DEVICE_SLOT_ALIASES: Record<DeviceInfoSlot, readonly string[]> = {
  manufacturer: ["manufacturer", "brand", "car_brand"],
  color: ["color"],
  condition: ["condition"],
  storage: ["storage", "capacity"],
  accessories: [
    "accessories",
    "deviceaccessories",
    "device_accessories",
    "includeditems",
    "included_items",
  ],
};

const DEVICE_SLOT_LABEL_AR: Record<DeviceInfoSlot, string> = {
  manufacturer: "الشركة المصنعة",
  color: "اللون",
  condition: "الحالة",
  storage: "السعة التخزينية",
  accessories: "الجهاز والملحقات",
};

/** alias normalized → فتحة العرض */
function buildAliasToSlotMap(): Map<string, DeviceInfoSlot> {
  const m = new Map<string, DeviceInfoSlot>();
  for (const slot of DEVICE_INFO_SLOTS_ORDER) {
    for (const a of DEVICE_SLOT_ALIASES[slot]) {
      m.set(normalizeDetailKey(a), slot);
    }
  }
  return m;
}

const ALIAS_TO_SLOT = buildAliasToSlotMap();

export type AdDeviceInfoCard = {
  id: string;
  label: string;
  value: string;
};

function normalizeRawDetailsObject(raw: unknown): Record<string, unknown> | null {
  let o: unknown = raw;
  if (typeof o === "string") {
    try {
      o = JSON.parse(o) as unknown;
    } catch {
      return null;
    }
  }
  if (!o || typeof o !== "object" || Array.isArray(o)) return null;
  const root = o as Record<string, unknown>;
  /** أحياناً يُخزَّن specs كنص JSON */
  if (typeof root.specs === "string") {
    try {
      const parsed = JSON.parse(root.specs) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return { ...root, specs: parsed };
      }
    } catch {
      /* ignore */
    }
  }
  return root;
}

/** لا ندخل هذه الأشجار — ليست مواصفات جهاز */
const SKIP_DEEP_SUBTREES = new Set([
  "shipping",
  "promotions",
]);

/**
 * يستخرج صفوف كرت «معلومات الجهاز» من `ad.details`:
 * - يمرّ على الشجرة بالكامل (مع تخطي shipping/promotions) لالتقاط specs متداخلة أو JSON قديم.
 * - في نموذج الإنشاء، العلامة التجارية للهواتف تُحفَظ في `categoryPath.leaf` وليس `specs.manufacturer`.
 * الأسبقية: أول قيمة غير فارغة لكل فتحة حسب ترتيب ظهور المفاتيح في JSON (عادة specs قبل categoryPath).
 */
export function extractDeviceInfoSectionRows(raw: unknown): AdDeviceInfoCard[] {
  const o = normalizeRawDetailsObject(raw);
  if (!o) return [];

  const slotValue = new Map<DeviceInfoSlot, string>();

  const considerPrimitive = (key: string, value: unknown) => {
    const nk = normalizeDetailKey(key);
    if (BLOCKED_DEVICE_INFO_KEYS.has(nk)) return;
    const s = coerceSpecValue(value);
    if (!s) return;
    const slot = ALIAS_TO_SLOT.get(nk);
    if (!slot) return;
    if (!slotValue.has(slot)) slotValue.set(slot, s.trim());
  };

  const walk = (node: unknown, depth: number): void => {
    if (depth > 12) return;
    if (node === null || node === undefined) return;
    if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
      return;
    }
    if (Array.isArray(node)) {
      for (const el of node) walk(el, depth + 1);
      return;
    }
    const rec = node as Record<string, unknown>;
    for (const [k, v] of Object.entries(rec)) {
      const nk = normalizeDetailKey(k);
      if (SKIP_DEEP_SUBTREES.has(nk)) continue;

      if (nk === "categorypath" && v && typeof v === "object" && !Array.isArray(v)) {
        const leaf = (v as Record<string, unknown>).leaf;
        if (typeof leaf === "string" && leaf.trim()) {
          if (!slotValue.has("manufacturer")) {
            slotValue.set("manufacturer", leaf.trim());
          }
        }
        continue;
      }

      if (v !== null && typeof v === "object" && !Array.isArray(v)) {
        walk(v, depth + 1);
      } else {
        considerPrimitive(k, v);
      }
    }
  };

  walk(o, 0);

  const rows: AdDeviceInfoCard[] = [];
  for (const slot of DEVICE_INFO_SLOTS_ORDER) {
    const val = slotValue.get(slot);
    if (!val) continue;
    rows.push({
      id: `device:${slot}`,
      label: DEVICE_SLOT_LABEL_AR[slot],
      value: val,
    });
  }
  return rows;
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
