import type { FieldGroupId } from "./types";

/** `${categorySlug}::${subcategoryName}` → field group (Blueprint v3.1 SSOT) */
export const CATEGORY_FIELD_GROUP_MAP: Record<string, FieldGroupId> = {
  // العقارات
  "immobilien::شقق للإيجار": "estate_apartment",
  "immobilien::شقق للبيع": "estate_apartment",
  "immobilien::منازل وفلل": "estate_house",
  "immobilien::غرف مشتركة": "estate_room",
  "immobilien::محلات ومكاتب": "estate_commercial",
  "immobilien::أراضٍ": "estate_land",
  // الأزياء
  "mode-beauty::ملابس رجالية": "fashion_clothing",
  "mode-beauty::ملابس نسائية": "fashion_clothing",
  "mode-beauty::أحذية": "fashion_shoes",
  "mode-beauty::حقائب": "fashion_bags",
  "mode-beauty::مجوهرات وساعات": "fashion_jewelry",
  "mode-beauty::عطور ومكياج": "fashion_beauty",
  // السيارات
  "auto-rad::سيارات": "car",
  "auto-rad::دراجات نارية": "motorcycle",
  "auto-rad::دراجات هوائية": "bicycle",
  "auto-rad::سكوتر وكهربائية": "scooter",
  "auto-rad::قطع غيار": "auto_parts",
  "auto-rad::إطارات وإكسسوارات": "tires",
  // المنزل
  "haus-garten::أثاث غرف نوم": "furniture",
  "haus-garten::أثاث صالون": "furniture",
  "haus-garten::أدوات مطبخ": "kitchen",
  "haus-garten::معدات مطاعم ومقاهي": "restaurant",
  "haus-garten::ديكور وإضاءة": "decor",
  "haus-garten::أدوات منزلية": "home_tools",
  "haus-garten::معدات ورش وحرف": "workshop",
  "haus-garten::مستلزمات صحية وطبية منزلية": "health",
  "haus-garten::حدائق ونباتات": "garden",
  // الإلكترونيات
  "elektronik::هواتف ذكية": "phone",
  "elektronik::تابلت": "tablet",
  "elektronik::حواسيب محمولة": "laptop",
  "elektronik::كمبيوتر مكتبي": "desktop",
  "elektronik::تلفزيونات": "tv",
  "elektronik::شاشات كمبيوتر": "monitor",
  "elektronik::ألعاب فيديو": "gaming",
  "elektronik::كاميرات": "camera",
  "elektronik::سماعات": "headphones",
  "elektronik::ساعات ذكية": "smartwatch",
  "elektronik::شواحن وكابلات": "cables",
  "elektronik::شبكات وراوترات": "router",
  "elektronik::طابعات": "printer",
  "elektronik::إكسسوارات إلكترونية": "elec_accessory",
  "elektronik::أجهزة منزلية": "home_appliance",
  // الوظائف
  "jobs::دوام كامل": "job",
  "jobs::دوام جزئي": "job",
  "jobs::عمل مؤقت": "job",
  "jobs::تدريب مهني": "job",
  "jobs::عمل عن بُعد": "job",
  // العائلة
  "familie::عربات أطفال": "baby_stroller",
  "familie::ملابس أطفال": "baby_clothes",
  "familie::ألعاب أطفال": "baby_toys",
  "familie::أثاث ومستلزمات أطفال": "baby_furniture",
  "familie::مستلزمات رضع": "baby_infant",
  // الحيوانات
  "haustiere::كلاب": "pet_live",
  "haustiere::قطط": "pet_live",
  "haustiere::طيور": "pet_live",
  "haustiere::أسماك": "pet_live",
  "haustiere::مستلزمات": "pet_supplies",
  // الترفيه
  "freizeit::رياضة ومعدات": "sports",
  "freizeit::معدات تصوير وإكسسوارات": "photo_gear",
  "freizeit::ألعاب لوحية": "board_game",
  "freizeit::رحلات وتخييم": "camping",
  "freizeit::هوايات يدوية": "hobby",
  "freizeit::أراجيل وشيشة ومستلزمات": "shisha",
  // موسيقى وكتب
  "musik-buecher::كتب": "book",
  "musik-buecher::آلات موسيقية": "instrument",
  "musik-buecher::أفلام ومسلسلات": "media",
  "musik-buecher::موسيقى وأسطوانات": "media",
  // تذاكر
  "tickets::حفلات": "ticket",
  "tickets::مباريات": "ticket",
  "tickets::مسرح وسينما": "ticket",
  "tickets::تذاكر سفر وقطار": "ticket",
  // خدمات
  "dienstleistungen::نقل عفش": "service",
  "dienstleistungen::تنظيف": "service",
  "dienstleistungen::صيانة وإصلاح": "service",
  "dienstleistungen::ترجمة": "service",
  "dienstleistungen::تصميم وتسويق": "service",
  "dienstleistungen::رعاية": "service",
  // تبادل
  "verschenken::مجاناً": "exchange",
  "verschenken::للمقايضة": "exchange",
  // دروس
  "unterricht::لغة ألمانية": "lesson",
  "unterricht::لغة عربية": "lesson",
  "unterricht::لغة إنجليزية": "lesson",
  "unterricht::مساعدة مدرسية": "lesson",
  "unterricht::دورات مهنية": "lesson",
  // جوار
  "nachbarschaft::مشاوير": "neighborhood",
  "nachbarschaft::مساعدة كبار السن": "neighborhood",
  "nachbarschaft::رعاية أطفال": "neighborhood",
  "nachbarschaft::مساعدة تقنية": "neighborhood",
  "nachbarschaft::أعمال صغيرة": "neighborhood",
};

export function categoryFieldGroupKey(
  categorySlug: string,
  subcategoryName: string,
): string {
  return `${categorySlug}::${subcategoryName}`;
}

export function getFieldGroupIdForCategory(
  categorySlug: string | undefined,
  subcategoryName: string | undefined,
): FieldGroupId | null {
  if (!categorySlug || !subcategoryName) return null;
  return CATEGORY_FIELD_GROUP_MAP[categoryFieldGroupKey(categorySlug, subcategoryName)] ?? null;
}

/** Coverage stats for audits */
export function metadataCoverageStats(): {
  totalMapped: number;
  uniqueGroups: number;
} {
  const values = Object.values(CATEGORY_FIELD_GROUP_MAP);
  return {
    totalMapped: values.length,
    uniqueGroups: new Set(values).size,
  };
}
