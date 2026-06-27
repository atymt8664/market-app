/**
 * Canonical category + subcategory tree — SSOT for taxonomy sync.
 * Blueprint: docs/architecture/Marketplace-Taxonomy-Architecture-Blueprint-v3.md (v3.1)
 * Consumed by: scripts/seed.ts, scripts/taxonomy-sync.ts, scripts/taxonomy-audit.ts
 * Create Ad + Browse read live rows from DB via GET /api/categories.
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
    subs: [
      "شقق للإيجار",
      "شقق للبيع",
      "منازل وفلل",
      "غرف مشتركة",
      "محلات ومكاتب",
      "أراضٍ",
    ],
  },
  {
    name: "الأزياء والجمال",
    slug: "mode-beauty",
    icon: "shirt",
    subtitle: "ملابس، إكسسوارات ومجوهرات",
    subs: [
      "ملابس رجالية",
      "ملابس نسائية",
      "أحذية",
      "حقائب",
      "مجوهرات وساعات",
      "عطور ومكياج",
    ],
  },
  {
    name: "السيارات والدراجات",
    slug: "auto-rad",
    icon: "car",
    subtitle: "مركبات وقطع غيار",
    subs: [
      "سيارات",
      "دراجات نارية",
      "دراجات هوائية",
      "سكوتر وكهربائية",
      "قطع غيار",
      "إطارات وإكسسوارات",
    ],
  },
  {
    name: "المنزل والحديقة",
    slug: "haus-garten",
    icon: "sofa",
    subtitle: "أثاث، ديكور وأدوات",
    subs: [
      "أثاث غرف نوم",
      "أثاث صالون",
      "أدوات مطبخ",
      "معدات مطاعم ومقاهي",
      "ديكور وإضاءة",
      "أدوات منزلية",
      "معدات ورش وحرف",
      "مستلزمات صحية وطبية منزلية",
      "حدائق ونباتات",
    ],
  },
  {
    name: "الإلكترونيات",
    slug: "elektronik",
    icon: "smartphone",
    subtitle: "هواتف، حاسوب وإكسسوارات",
    subs: [
      "هواتف ذكية",
      "تابلت",
      "حواسيب محمولة",
      "كمبيوتر مكتبي",
      "تلفزيونات",
      "شاشات كمبيوتر",
      "ألعاب فيديو",
      "كاميرات",
      "سماعات",
      "ساعات ذكية",
      "شواحن وكابلات",
      "شبكات وراوترات",
      "طابعات",
      "إكسسوارات إلكترونية",
      "أجهزة منزلية",
    ],
  },
  {
    name: "الوظائف",
    slug: "jobs",
    icon: "briefcase",
    subtitle: "فرص عمل وتدريب",
    subs: ["دوام كامل", "دوام جزئي", "عمل مؤقت", "تدريب مهني", "عمل عن بُعد"],
  },
  {
    name: "العائلة والأطفال",
    slug: "familie",
    icon: "baby",
    subtitle: "ألعاب ومستلزمات أطفال",
    subs: [
      "عربات أطفال",
      "ملابس أطفال",
      "ألعاب أطفال",
      "أثاث ومستلزمات أطفال",
      "مستلزمات رضع",
    ],
  },
  {
    name: "الحيوانات الأليفة",
    slug: "haustiere",
    icon: "paw-print",
    subtitle: "حيوانات ومستلزماتها",
    subs: ["كلاب", "قطط", "طيور", "أسماك", "مستلزمات"],
  },
  {
    name: "الترفيه والهوايات",
    slug: "freizeit",
    icon: "tent",
    subtitle: "رياضة، رحلات وفنون",
    subs: [
      "رياضة ومعدات",
      "معدات تصوير وإكسسوارات",
      "ألعاب لوحية",
      "رحلات وتخييم",
      "هوايات يدوية",
      "أراجيل وشيشة ومستلزمات",
    ],
  },
  {
    name: "الموسيقى والكتب",
    slug: "musik-buecher",
    icon: "book-open",
    subtitle: "كتب، آلات وأفلام",
    subs: ["كتب", "آلات موسيقية", "أفلام ومسلسلات", "موسيقى وأسطوانات"],
  },
  {
    name: "تذاكر وفعاليات",
    slug: "tickets",
    icon: "ticket",
    subtitle: "حفلات، رياضة وسفر",
    subs: ["حفلات", "مباريات", "مسرح وسينما", "تذاكر سفر وقطار"],
  },
  {
    name: "الخدمات",
    slug: "dienstleistungen",
    icon: "wrench",
    subtitle: "صيانة، تنظيف ونقل",
    subs: [
      "نقل عفش",
      "تنظيف",
      "صيانة وإصلاح",
      "ترجمة",
      "تصميم وتسويق",
      "رعاية",
    ],
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
    subs: [
      "لغة ألمانية",
      "لغة عربية",
      "لغة إنجليزية",
      "مساعدة مدرسية",
      "دورات مهنية",
    ],
  },
  {
    name: "مساعدة الجوار",
    slug: "nachbarschaft",
    icon: "heart-handshake",
    subtitle: "خدمات قريبة منك",
    subs: [
      "مشاوير",
      "مساعدة كبار السن",
      "رعاية أطفال",
      "مساعدة تقنية",
      "أعمال صغيرة",
    ],
  },
];

export function referenceTaxonomySubcategoryCount(): number {
  return REFERENCE_CATEGORY_TAXONOMY.reduce((n, c) => n + c.subs.length, 0);
}
