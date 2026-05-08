/**
 * Canonical category + subcategory tree from the legacy workspace seed (`scripts/src/seed.ts`).
 * Single source of truth for local/staging taxonomy — not production data.
 */
export type ReferenceCategoryTaxonomyItem = {
  name: string;
  slug: string;
  icon: string;
  subtitle: string;
  subs: string[];
};

export const REFERENCE_CATEGORY_TAXONOMY: ReferenceCategoryTaxonomyItem[] = [
  {
    name: "العقارات",
    slug: "immobilien",
    icon: "home",
    subtitle: "شقق، منازل وأراضٍ",
    subs: ["شقق للإيجار", "شقق للبيع", "غرف مشتركة", "محلات تجارية"],
  },
  {
    name: "الأزياء والجمال",
    slug: "mode-beauty",
    icon: "shirt",
    subtitle: "ملابس، إكسسوارات ومجوهرات",
    subs: ["ملابس رجالية", "ملابس نسائية", "ملابس أطفال", "أحذية", "حقائب وإكسسوارات", "عطور وعناية"],
  },
  {
    name: "السيارات والدراجات",
    slug: "auto-rad",
    icon: "car",
    subtitle: "مركبات وقطع غيار",
    subs: ["سيارات", "دراجات نارية", "دراجات هوائية", "قطع غيار", "إطارات"],
  },
  {
    name: "المنزل والحديقة",
    slug: "haus-garten",
    icon: "sofa",
    subtitle: "أثاث، ديكور وأدوات",
    subs: ["أثاث غرف نوم", "أثاث صالون", "أدوات مطبخ", "ديكور", "حدائق ونباتات"],
  },
  {
    name: "الإلكترونيات",
    slug: "elektronik",
    icon: "smartphone",
    subtitle: "هواتف وأجهزة كمبيوتر",
    subs: ["هواتف ذكية", "حواسيب محمولة", "تلفزيونات", "ألعاب فيديو", "أجهزة منزلية"],
  },
  {
    name: "الوظائف",
    slug: "jobs",
    icon: "briefcase",
    subtitle: "فرص عمل وتدريب",
    subs: ["دوام كامل", "دوام جزئي", "تدريب مهني", "عمل عن بُعد"],
  },
  {
    name: "العائلة والأطفال",
    slug: "familie",
    icon: "baby",
    subtitle: "ألعاب ومستلزمات أطفال",
    subs: ["عربات أطفال", "ملابس أطفال", "ألعاب", "حضانة"],
  },
  {
    name: "الحيوانات الأليفة",
    slug: "haustiere",
    icon: "paw-print",
    subtitle: "حيوانات ومستلزماتها",
    subs: ["قطط", "كلاب", "طيور", "مستلزمات"],
  },
  {
    name: "الترفيه والهوايات",
    slug: "freizeit",
    icon: "tent",
    subtitle: "رياضة، رحلات وفنون",
    subs: ["رياضة", "موسيقى", "كتب", "كاميرات", "ألعاب لوحية"],
  },
  {
    name: "الموسيقى والكتب",
    slug: "musik-buecher",
    icon: "book-open",
    subtitle: "كتب، آلات وأفلام",
    subs: ["كتب عربية", "كتب ألمانية", "آلات موسيقية", "أفلام"],
  },
  {
    name: "تذاكر وفعاليات",
    slug: "tickets",
    icon: "ticket",
    subtitle: "حفلات، رياضة وقطارات",
    subs: ["حفلات", "مباريات", "تذاكر قطار"],
  },
  {
    name: "الخدمات",
    slug: "dienstleistungen",
    icon: "wrench",
    subtitle: "صيانة، تنظيف ورعاية",
    subs: ["نقل عفش", "تنظيف", "صيانة", "ترجمة", "دروس خصوصية"],
  },
  {
    name: "للتبادل والإهداء",
    slug: "verschenken",
    icon: "gift",
    subtitle: "مجاناً ومقايضة",
    subs: ["مجاناً", "للمقايضة"],
  },
  {
    name: "دروس ودورات",
    slug: "unterricht",
    icon: "graduation-cap",
    subtitle: "تعليم لغات ومساعدة دراسية",
    subs: ["لغة ألمانية", "لغة عربية", "مساعدة مدرسية", "دورات مهنية"],
  },
  {
    name: "مساعدة الجوار",
    slug: "nachbarschaft",
    icon: "heart-handshake",
    subtitle: "خدمات قريبة منك",
    subs: ["مشاوير", "مساعدة كبار السن", "أعمال صغيرة"],
  },
];

export function referenceTaxonomySubcategoryCount(): number {
  return REFERENCE_CATEGORY_TAXONOMY.reduce((n, c) => n + c.subs.length, 0);
}
