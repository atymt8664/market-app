import {
  useListCategories,
  useListSubcategories,
  useCreateAd,
  useUpdateAd,
  useGetAd,
  useImproveDescription,
  useSuggestPrice,
  getListSubcategoriesQueryKey,
  getGetAdQueryKey,
  getListMyAdsQueryKey,
  getListRecommendedAdsQueryKey,
  ApiError,
} from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  Sparkles,
  Loader2,
  Check,
  Plus,
  Truck,
  ShieldAlert,
  X,
} from "lucide-react";
import { useUpload } from "@workspace/object-storage-web";
import { useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocale } from "@/hooks/use-locale";
import { CitySelect } from "@/components/city-select";
import { CreateAdPreviewDialog } from "@/components/create-ad-preview-dialog";
import { CreateAdImageGallery } from "@/components/create-ad-image-gallery";
import { CreateAdPromotionTeaser } from "@/components/create-ad-promotion-teaser";
import { CreateAdDraggableAiFab } from "@/components/create-ad-draggable-ai-fab";
import {
  CreateAdImproveDialog,
  type CreateAdImproveProposal,
} from "@/components/create-ad-improve-dialog";
import {
  buildAdDetailsPayload,
  parseStoredAdDetails,
} from "@/lib/ad-stored-details";
import { cn } from "@/lib/utils";
import { BOTTOM_NAV_PAGE_SHELL_CLASS } from "@/lib/bottom-nav-layout";
import { SETTINGS_PRIMARY_BUTTON } from "@/components/settings-shell";
import { t } from "@/i18n";
import { useAppChromePage } from "@/contexts/app-chrome-context";
import { useSelectedCity } from "@/hooks/use-selected-city";
import { getCreateAdTaxonomyLabel } from "@/lib/create-ad-taxonomy-labels";
import { GERMAN_CITIES } from "@/lib/german-cities";

/** هوية dark/lime — نفس روح ad-detail / profile */
const adCardShell =
  "rounded-2xl border border-primary/40 bg-[#0A0A0A]/75 p-3 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 md:p-4";
const adCardShellCompact =
  "rounded-2xl border border-primary/35 bg-[#0A0A0A]/70 p-2 shadow-[0_0_18px_-12px_hsl(var(--primary)/0.14)] ring-1 ring-primary/10 md:p-2.5";
const adInputClass =
  "border border-primary/30 bg-[#0A0A0A]/90 text-foreground placeholder:text-zinc-500 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0 focus-visible:ring-offset-[#0A0A0A]";

/** عناوين أقسام — نفس أسلوب Home (إعلانات مميزة / موصى لك / التصنيفات) */
const createAdSectionHeading = cn(
  "inline-flex max-w-full w-fit items-center rounded-2xl border border-primary/35 bg-[#0A0A0A]/80 px-2 py-px",
  "text-sm font-semibold leading-tight tracking-tight text-foreground md:text-base",
  "shadow-[0_0_14px_-12px_hsl(var(--primary)/0.16)] ring-1 ring-primary/10 bg-[#0A0A0A]/70",
);

/** زرّان h-11 + فجوة + تنفس فوق الشريط السفلي — فوق spacer القياسي للـ BottomNav */
const createAdScrollEndSpacer =
  "min-h-[calc(7rem+env(safe-area-inset-bottom,0px))] shrink-0 bg-[#0A0A0A] md:min-h-[calc(7.25rem+env(safe-area-inset-bottom,0px))]";

const MARKETPLACE_COUNTRY_CODE = "DE";
const germanCitySet = new Set(
  GERMAN_CITIES.map((name) => name.trim().toLowerCase()),
);

function isGermanMarketplaceCity(city: string): boolean {
  const trimmed = city.trim();
  return trimmed.length >= 2 && germanCitySet.has(trimmed.toLowerCase());
}

/** Bottom sheets على صفحة إنشاء إعلان — خلفية داكنة + حدود lime */
const createAdSheetContentBase =
  "flex max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden rounded-t-2xl border-t border-primary/35 bg-[#0A0A0A] p-0 shadow-[0_-12px_48px_-16px_rgba(0,0,0,0.55)] ring-1 ring-primary/20";
const createAdSheetCloseBtn =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/45 bg-[#0A0A0A]/90 text-primary transition-colors hover:border-primary/65 hover:bg-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 active:opacity-90";

function CreateAdSheetHeader({ title }: { title: string }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-primary/20 px-4 pb-2.5 pt-3">
      <SheetTitle className="m-0 flex-1 text-right text-base font-semibold leading-tight text-white">
        {title}
      </SheetTitle>
      <SheetClose
        type="button"
        className={createAdSheetCloseBtn}
        aria-label={t("create_ad.images.close")}
      >
        <X className="h-4 w-4" />
      </SheetClose>
    </div>
  );
}

const createAdSchema = z.object({
  title: z
    .string()
    .min(3, "create_ad.validation.title_short")
    .max(65, "create_ad.validation.title_long"),
  description: z
    .string()
    .min(10, "create_ad.validation.description_short")
    .max(4000, "create_ad.validation.description_long"),
  price: z.coerce.number().optional().nullable(),
  priceType: z.enum(["fixed", "negotiable", "free", "swap"]),
  type: z.enum(["offer", "request"]),
  categoryId: z.number().min(1, "create_ad.validation.category_required"),
  subcategoryId: z.number().optional().nullable(),
  city: z.string().min(2, "create_ad.validation.city_required"),
  sellerName: z.string().min(2, "create_ad.validation.name_required"),
  sellerPhone: z.string().min(5, "create_ad.validation.phone_required"),
  images: z.array(z.string()).optional(),
});

type CreateAdFormValues = z.infer<typeof createAdSchema>;

interface CreateAdProps {
  editId?: number;
}

const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
  "gif",
  "bmp",
];

type DynamicFieldType = "select";
interface DynamicFieldDef {
  id: string;
  label: string;
  type: DynamicFieldType;
  options?: string[];
}

interface CategoryLeaf {
  name: string;
  dynamicFields?: DynamicFieldDef[];
}

interface CategorySubcategory {
  name: string;
  options?: CategoryLeaf[];
  dynamicFields?: DynamicFieldDef[];
}

interface CategoryMain {
  name: string;
  subcategories: CategorySubcategory[];
  dynamicFields?: DynamicFieldDef[];
}

interface SelectedCategoryPath {
  main: string;
  sub: string;
  leaf?: string;
}

interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  priceText?: string;
  compactPrice?: string;
  logo: "hermes" | "dhl" | "dpd" | "ups" | "gls" | "other";
}

interface UploadFailureDetail {
  index: number;
  name: string;
  type: string;
  size: number;
  reason: string;
}

interface UploadResult {
  src: string;
  remoteUrl: string;
}

interface CurrencyOption {
  id: string;
  label: string;
}

const ELECTRONICS_PHONE_FIELDS: DynamicFieldDef[] = [
  {
    id: "color",
    label: "اللون",
    type: "select",
    options: [
      "أسود",
      "أبيض",
      "فضي",
      "ذهبي",
      "أزرق",
      "أحمر",
      "أخضر",
      "بنفسجي",
      "وردي",
      "رمادي",
      "أخرى",
    ],
  },
  {
    id: "condition",
    label: "الحالة",
    type: "select",
    options: [
      "جديد",
      "مثل الجديد",
      "جيد جداً",
      "جيد",
      "مقبول",
      "يحتاج صيانة",
    ],
  },
  {
    id: "storage",
    label: "السعة التخزينية",
    type: "select",
    options: ["16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "أخرى"],
  },
  {
    id: "accessories",
    label: "الجهاز والملحقات",
    type: "select",
    options: [
      "الجهاز فقط",
      "مع الشاحن",
      "مع العلبة",
      "مع الشاحن والعلبة",
      "مع سماعات",
      "كامل الملحقات",
    ],
  },
];

const CATEGORY_TREE: CategoryMain[] = [
  {
    name: "السيارات والدراجات والقوارب",
    subcategories: [
      {
        name: "سيارات",
        dynamicFields: [
          {
            id: "car_brand",
            label: "الشركة",
            type: "select",
            options: [
              "BMW",
              "Mercedes",
              "Audi",
              "Volkswagen",
              "Toyota",
              "Hyundai",
              "Kia",
              "Opel",
              "Ford",
              "Renault",
              "أخرى",
            ],
          },
          {
            id: "car_model",
            label: "الموديل",
            type: "select",
            options: ["صغير", "سيدان", "SUV", "كوبيه", "هاتشباك", "فان", "أخرى"],
          },
          {
            id: "year",
            label: "سنة الصنع",
            type: "select",
            options: [
              "2025+",
              "2020-2024",
              "2015-2019",
              "2010-2014",
              "2005-2009",
              "2000-2004",
              "أقدم",
            ],
          },
          {
            id: "mileage",
            label: "الكيلومترات",
            type: "select",
            options: [
              "أقل من 50,000",
              "50,000 - 100,000",
              "100,000 - 150,000",
              "150,000 - 200,000",
              "200,000+",
            ],
          },
          {
            id: "fuel",
            label: "نوع الوقود",
            type: "select",
            options: ["بنزين", "ديزل", "كهرباء", "هايبرد", "غاز", "أخرى"],
          },
          {
            id: "transmission",
            label: "ناقل الحركة",
            type: "select",
            options: ["أوتوماتيك", "يدوي", "نصف أوتوماتيك"],
          },
        ],
      },
      { name: "دراجات نارية", options: [{ name: "رياضية" }, { name: "سكوتر" }, { name: "كلاسيكية" }] },
      { name: "دراجات هوائية", options: [{ name: "جبلية" }, { name: "مدينة" }, { name: "طريق" }] },
      { name: "قوارب", options: [{ name: "قوارب صيد" }, { name: "قوارب نزهة" }, { name: "أخرى" }] },
      { name: "قطع غيار وإكسسوارات", options: [{ name: "إطارات" }, { name: "بطاريات" }, { name: "زيوت" }] },
    ],
  },
  {
    name: "العقارات",
    subcategories: [
      {
        name: "شقق",
        dynamicFields: [
          {
            id: "estate_type",
            label: "نوع العقار",
            type: "select",
            options: ["شقة", "استوديو", "دوبلكس", "بنتهاوس"],
          },
          {
            id: "area",
            label: "المساحة",
            type: "select",
            options: [
              "أقل من 50 م²",
              "50-80 م²",
              "80-120 م²",
              "120-180 م²",
              "أكثر من 180 م²",
            ],
          },
          {
            id: "rooms",
            label: "عدد الغرف",
            type: "select",
            options: ["1", "2", "3", "4", "5+", "استوديو"],
          },
          {
            id: "rent_sale",
            label: "الإيجار/البيع",
            type: "select",
            options: ["إيجار", "بيع"],
          },
        ],
      },
      { name: "منازل", options: [{ name: "منزل مستقل" }, { name: "تاون هاوس" }, { name: "فيلا" }] },
      { name: "غرف وسكن مشترك", options: [{ name: "غرفة مفردة" }, { name: "غرفة مزدوجة" }] },
      { name: "مكاتب ومحلات", options: [{ name: "مكتب" }, { name: "محل تجاري" }, { name: "مخزن" }] },
      { name: "أراضٍ", options: [{ name: "سكنية" }, { name: "زراعية" }, { name: "استثمارية" }] },
    ],
  },
  {
    name: "المنزل والحديقة",
    subcategories: [
      { name: "أثاث", options: [{ name: "غرفة نوم" }, { name: "صالة" }, { name: "مكتب" }, { name: "أخرى" }] },
      { name: "أجهزة منزلية", options: [{ name: "مطبخ" }, { name: "تنظيف" }, { name: "تدفئة وتبريد" }] },
      { name: "مستلزمات الحديقة", options: [{ name: "نباتات" }, { name: "أدوات حدائق" }, { name: "جلسات خارجية" }] },
      { name: "ديكور", options: [{ name: "لوحات" }, { name: "سجاد" }, { name: "إضاءة" }] },
    ],
  },
  {
    name: "الموضة والجمال",
    subcategories: [
      { name: "ملابس نسائية", options: [{ name: "فساتين" }, { name: "جاكيتات" }, { name: "عبايات" }] },
      { name: "ملابس رجالية", options: [{ name: "قمصان" }, { name: "بدلات" }, { name: "أحذية" }] },
      { name: "أحذية وحقائب", options: [{ name: "أحذية" }, { name: "حقائب" }, { name: "إكسسوارات" }] },
      { name: "مستحضرات تجميل", options: [{ name: "عناية بالبشرة" }, { name: "مكياج" }, { name: "عطور" }] },
    ],
  },
  {
    name: "الإلكترونيات",
    subcategories: [
      {
        name: "الهواتف المحمولة",
        options: [
          { name: "آبل", dynamicFields: ELECTRONICS_PHONE_FIELDS },
          { name: "سامسونج", dynamicFields: ELECTRONICS_PHONE_FIELDS },
          { name: "شاومي", dynamicFields: ELECTRONICS_PHONE_FIELDS },
          { name: "هواوي", dynamicFields: ELECTRONICS_PHONE_FIELDS },
          { name: "نوكيا", dynamicFields: ELECTRONICS_PHONE_FIELDS },
          { name: "سوني", dynamicFields: ELECTRONICS_PHONE_FIELDS },
          { name: "جوجل", dynamicFields: ELECTRONICS_PHONE_FIELDS },
          { name: "أخرى", dynamicFields: ELECTRONICS_PHONE_FIELDS },
        ],
      },
      { name: "أجهزة كمبيوتر", options: [{ name: "لابتوب" }, { name: "كمبيوتر مكتبي" }, { name: "شاشات" }] },
      { name: "أجهزة لوحية", options: [{ name: "آيباد" }, { name: "سامسونج تاب" }, { name: "أخرى" }] },
      { name: "ألعاب فيديو", options: [{ name: "PlayStation" }, { name: "Xbox" }, { name: "Nintendo" }] },
      { name: "إكسسوارات إلكترونية", options: [{ name: "سماعات" }, { name: "شواحن" }, { name: "ساعات ذكية" }] },
    ],
  },
  {
    name: "الحيوانات الأليفة",
    subcategories: [
      { name: "كلاب", options: [{ name: "تبنّي" }, { name: "مستلزمات" }, { name: "تدريب" }] },
      { name: "قطط", options: [{ name: "تبنّي" }, { name: "مستلزمات" }, { name: "عناية" }] },
      { name: "طيور", options: [{ name: "ببغاوات" }, { name: "كناري" }, { name: "أقفاص" }] },
      { name: "أسماك", options: [{ name: "أحواض" }, { name: "أسماك زينة" }, { name: "إكسسوارات" }] },
    ],
  },
  {
    name: "الأسرة والطفل والرضّع",
    subcategories: [
      { name: "عربات أطفال", options: [{ name: "عربة مفردة" }, { name: "عربة مزدوجة" }] },
      { name: "ملابس أطفال", options: [{ name: "حديثو الولادة" }, { name: "أطفال" }, { name: "مراهقون" }] },
      { name: "ألعاب", options: [{ name: "تعليمية" }, { name: "إلكترونية" }, { name: "خارجية" }] },
      { name: "أثاث أطفال", options: [{ name: "أسرة" }, { name: "خزائن" }, { name: "مكاتب دراسة" }] },
    ],
  },
  {
    name: "الوظائف",
    subcategories: [
      { name: "دوام كامل", options: [{ name: "تقني" }, { name: "مبيعات" }, { name: "إدارة" }] },
      { name: "دوام جزئي", options: [{ name: "مطاعم" }, { name: "توصيل" }, { name: "خدمات" }] },
      { name: "تدريب عملي", options: [{ name: "طلاب" }, { name: "خريجون" }] },
      { name: "عمل حر", options: [{ name: "تصميم" }, { name: "برمجة" }, { name: "كتابة" }] },
    ],
  },
  {
    name: "أوقات الفراغ والهوايات والجوار",
    subcategories: [
      { name: "رياضة ولياقة", options: [{ name: "معدات رياضية" }, { name: "دراجات" }, { name: "ملابس رياضية" }] },
      { name: "هوايات يدوية", options: [{ name: "رسم" }, { name: "خياطة" }, { name: "أعمال خشبية" }] },
      { name: "فعاليات الجوار", options: [{ name: "لقاءات" }, { name: "أنشطة عائلية" }] },
      { name: "رحلات وتخييم", options: [{ name: "خيام" }, { name: "معدات طبخ" }, { name: "إضاءة" }] },
    ],
  },
  {
    name: "الموسيقى والأفلام والكتب",
    subcategories: [
      { name: "آلات موسيقية", options: [{ name: "غيتار" }, { name: "بيانو" }, { name: "آلات إيقاعية" }] },
      { name: "أفلام", options: [{ name: "DVD/Blu-ray" }, { name: "ملصقات" }, { name: "مقتنيات" }] },
      { name: "كتب", options: [{ name: "روايات" }, { name: "تعليمية" }, { name: "أطفال" }] },
      { name: "موسيقى", options: [{ name: "أسطوانات" }, { name: "معدات صوت" }, { name: "إكسسوارات" }] },
    ],
  },
  {
    name: "تذاكر الدخول والتذاكر",
    subcategories: [
      { name: "حفلات", options: [{ name: "موسيقية" }, { name: "كوميدية" }, { name: "مهرجانات" }] },
      { name: "رياضة", options: [{ name: "كرة قدم" }, { name: "كرة سلة" }, { name: "أخرى" }] },
      { name: "مسرح وسينما", options: [{ name: "مسرح" }, { name: "سينما" }] },
      { name: "مواصلات وسفر", options: [{ name: "قطارات" }, { name: "طيران" }, { name: "حافلات" }] },
    ],
  },
  {
    name: "الخدمات",
    subcategories: [
      { name: "صيانة وإصلاح", options: [{ name: "كهرباء" }, { name: "سباكة" }, { name: "هواتف" }] },
      { name: "تنظيف", options: [{ name: "منازل" }, { name: "مكاتب" }, { name: "سيارات" }] },
      { name: "نقل وتوصيل", options: [{ name: "نقل أثاث" }, { name: "توصيل محلي" }] },
      { name: "تصميم وتسويق", options: [{ name: "تصميم جرافيك" }, { name: "تسويق رقمي" }] },
    ],
  },
  {
    name: "الهدايا والتبادل",
    subcategories: [
      { name: "هدايا مجانية", options: [{ name: "منزلية" }, { name: "ملابس" }, { name: "أطفال" }] },
      { name: "تبادل إلكترونيات", options: [{ name: "هواتف" }, { name: "ألعاب" }, { name: "إكسسوارات" }] },
      { name: "تبادل أثاث", options: [{ name: "غرف نوم" }, { name: "صالونات" }] },
      { name: "تبادل خدمات", options: [{ name: "تعليم مقابل تعليم" }, { name: "نقل مقابل صيانة" }] },
    ],
  },
  {
    name: "الدروس والكورسات",
    subcategories: [
      { name: "لغات", options: [{ name: "ألمانية" }, { name: "إنجليزية" }, { name: "عربية" }] },
      { name: "تقنية", options: [{ name: "برمجة" }, { name: "تصميم" }, { name: "تحليل بيانات" }] },
      { name: "دروس مدرسية", options: [{ name: "رياضيات" }, { name: "علوم" }, { name: "لغات" }] },
      { name: "دروس موسيقى", options: [{ name: "غيتار" }, { name: "بيانو" }, { name: "غناء" }] },
    ],
  },
  {
    name: "مساعدة الجيران",
    subcategories: [
      { name: "مساعدة منزلية", options: [{ name: "تسوق" }, { name: "تنظيف خفيف" }, { name: "أعمال بسيطة" }] },
      { name: "رعاية كبار السن", options: [{ name: "مرافقة" }, { name: "تسوق أدوية" }] },
      { name: "رعاية أطفال", options: [{ name: "ساعات مسائية" }, { name: "عطلات نهاية الأسبوع" }] },
      { name: "مساعدة تقنية", options: [{ name: "إعداد هواتف" }, { name: "حل مشاكل الكمبيوتر" }] },
    ],
  },
];

const normalizeLabel = (value?: string | null) =>
  (value ?? "")
    .toString()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .toLowerCase();

const isSupportedImageFile = (file: File) => {
  if (file.type && file.type.startsWith("image/")) return true;
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  return ALLOWED_IMAGE_EXTENSIONS.includes(extension);
};

const formatFileSizeMb = (bytes: number) =>
  `${(bytes / (1024 * 1024)).toFixed(2)}MB`;

const CURRENCY_OPTIONS: CurrencyOption[] = [
  { id: "EUR", label: "EUR (€)" },
  { id: "USD", label: "USD ($)" },
  { id: "CAD", label: "CAD (C$)" },
  { id: "GBP", label: "GBP (£)" },
  { id: "CHF", label: "CHF" },
  { id: "SEK", label: "SEK" },
  { id: "NOK", label: "NOK" },
  { id: "DKK", label: "DKK" },
];

export default function CreateAd({ editId }: CreateAdProps = {}) {
  const { locale } = useLocale();
  const isRtl = locale === "ar";
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { countryCode: savedMarketCountryCode } = useSelectedCity();
  const queryClient = useQueryClient();
  const isEdit = typeof editId === "number";
  useAppChromePage({
    titleKey: isEdit ? "create_ad.edit_title" : "create_ad.create_title",
  });
  const accountCountryCode =
    savedMarketCountryCode.trim().toUpperCase() || MARKETPLACE_COUNTRY_CODE;

  const fieldErrorMsg = (msg: string | undefined) => {
    if (!msg) return null;
    return msg.startsWith("create_ad.") ? t(msg) : msg;
  };

  const shippingMethods: ShippingMethod[] = useMemo(
    () => [
      {
        id: "dhl_paket",
        name: t("create_ad.shipping.dhl_paket_name"),
        description: t("create_ad.shipping.dhl_paket_desc"),
        priceText: t("create_ad.shipping.from_699"),
        compactPrice: "6.19 €",
        logo: "dhl",
      },
      {
        id: "dhl_packchen",
        name: t("create_ad.shipping.dhl_packchen_name"),
        description: t("create_ad.shipping.dhl_packchen_desc"),
        priceText: t("create_ad.shipping.from_479"),
        logo: "dhl",
      },
      {
        id: "hermes_packchen",
        name: t("create_ad.shipping.hermes_packchen_name"),
        description: t("create_ad.shipping.hermes_packchen_desc"),
        priceText: t("create_ad.shipping.from_450"),
        compactPrice: "1.99 €",
        logo: "hermes",
      },
      {
        id: "hermes_s_paket",
        name: t("create_ad.shipping.hermes_s_paket_name"),
        description: t("create_ad.shipping.hermes_s_paket_desc"),
        priceText: t("create_ad.shipping.from_595"),
        compactPrice: "2.49 €",
        logo: "hermes",
      },
      {
        id: "dpd_paket",
        name: t("create_ad.shipping.dpd_name"),
        description: t("create_ad.shipping.dpd_desc"),
        logo: "dpd",
      },
      {
        id: "ups_paket",
        name: t("create_ad.shipping.ups_name"),
        description: t("create_ad.shipping.ups_desc"),
        logo: "ups",
      },
      {
        id: "gls_paket",
        name: t("create_ad.shipping.gls_name"),
        description: t("create_ad.shipping.gls_desc"),
        logo: "gls",
      },
      {
        id: "other",
        name: t("create_ad.shipping.other_name"),
        description: t("create_ad.shipping.other_desc"),
        logo: "other",
      },
    ],
    [locale],
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const target = isEdit ? `/edit/${editId}` : "/new";
      navigate(`/guest-welcome?redirect=${encodeURIComponent(target)}`);
    }
  }, [authLoading, isAuthenticated, isEdit, editId, navigate]);

  const { data: categories } = useListCategories();
  const { data: existingAd } = useGetAd(editId ?? 0, {
    query: { enabled: isEdit, queryKey: getGetAdQueryKey(editId ?? 0) },
  });
  const createAdMutation = useCreateAd();
  const updateAdMutation = useUpdateAd();
  const improveDescMutation = useImproveDescription({
    mutation: { retry: 0 },
    request: { signal: AbortSignal.timeout(55_000) },
  });
  const suggestPriceMutation = useSuggestPrice({
    mutation: { retry: 0 },
    request: { signal: AbortSignal.timeout(55_000) },
  });

  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [selectedCategoryPath, setSelectedCategoryPath] =
    useState<SelectedCategoryPath | null>(null);
  const [dynamicFieldValues, setDynamicFieldValues] = useState<
    Record<string, string>
  >({});
  const [pickerMain, setPickerMain] = useState<CategoryMain | null>(null);
  const [pickerSub, setPickerSub] = useState<CategorySubcategory | null>(null);
  const [shippingSheetOpen, setShippingSheetOpen] = useState(false);
  const [photoTipsOpen, setPhotoTipsOpen] = useState(false);
  const [currencySheetOpen, setCurrencySheetOpen] = useState(false);
  const [priceTypeSheetOpen, setPriceTypeSheetOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("EUR");
  const [tempShippingIds, setTempShippingIds] = useState<string[]>([]);
  const [shippingIds, setShippingIds] = useState<string[]>([]);
  const [pickupOnly, setPickupOnly] = useState(false);
  const [tempPickupOnly, setTempPickupOnly] = useState(false);
  const [directBuy, setDirectBuy] = useState<"yes" | "no">("no");
  const [sellerSafetyAccepted, setSellerSafetyAccepted] = useState(false);
  const [safetyNoticeExpanded, setSafetyNoticeExpanded] = useState(false);
  const [showAiImproveHint, setShowAiImproveHint] = useState(true);
  const [improveDialogOpen, setImproveDialogOpen] = useState(false);
  const [improveProposal, setImproveProposal] =
    useState<CreateAdImproveProposal | null>(null);
  const [improveOriginal, setImproveOriginal] =
    useState<CreateAdImproveProposal>({ title: "", description: "" });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isSubmittingUploads, setIsSubmittingUploads] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImageFilesRef = useRef<Record<string, File>>({});
  const { uploadFile, isUploading, progress } = useUpload();

  const { data: subcategories } = useListSubcategories(selectedCatId || 0, {
    query: {
      enabled: !!selectedCatId,
      queryKey: getListSubcategoriesQueryKey(selectedCatId || 0),
    },
  });

  const form = useForm<CreateAdFormValues>({
    resolver: zodResolver(createAdSchema),
    defaultValues: {
      title: "",
      description: "",
      price: null,
      priceType: "fixed",
      type: "offer",
      categoryId: 0,
      subcategoryId: null,
      city:
        user?.city && isGermanMarketplaceCity(user.city) ? user.city.trim() : "",
      sellerName: user?.name || "",
      sellerPhone: user?.phone || "",
      images: [],
    },
  });

  useEffect(() => {
    if (existingAd && isEdit) {
      form.reset({
        title: existingAd.title,
        description: existingAd.description,
        price: existingAd.price,
        priceType: existingAd.priceType as
          | "fixed"
          | "negotiable"
          | "free"
          | "swap",
        type: existingAd.type as "offer" | "request",
        categoryId: existingAd.categoryId,
        subcategoryId: existingAd.subcategoryId ?? null,
        city: existingAd.city,
        sellerName: existingAd.sellerName,
        sellerPhone: existingAd.sellerPhone,
        images: existingAd.images,
      });
      setSelectedCatId(existingAd.categoryId);
      setUploadedImages([...(existingAd.images ?? [])]);
      pendingImageFilesRef.current = {};

      const parsed = parseStoredAdDetails(existingAd.details);
      setDynamicFieldValues(parsed.specs);
      if (parsed.meta?.categoryPath) {
        setSelectedCategoryPath(parsed.meta.categoryPath);
      }
      if (parsed.meta?.currency) setSelectedCurrency(parsed.meta.currency);
      if (parsed.meta?.shipping) {
        setShippingIds(parsed.meta.shipping.ids ?? []);
        setPickupOnly(parsed.meta.shipping.pickupOnly ?? false);
      }
      if (parsed.meta?.directBuy === "yes" || parsed.meta?.directBuy === "no") {
        setDirectBuy(parsed.meta.directBuy);
      }
    }
  }, [existingAd, isEdit, form]);

  useEffect(() => {
    if (!isEdit && user) {
      if (!form.getValues("sellerName")) form.setValue("sellerName", user.name);
      if (!form.getValues("sellerPhone"))
        form.setValue("sellerPhone", user.phone);
      const profileCity = user.city?.trim() ?? "";
      if (!form.getValues("city") && profileCity && isGermanMarketplaceCity(profileCity)) {
        form.setValue("city", profileCity, { shouldValidate: true });
      }
    }
  }, [user, isEdit, form]);

  const validateCityBeforePublish = useCallback((): boolean => {
    const cityTrim = form.getValues("city")?.trim() ?? "";

    if (
      savedMarketCountryCode.trim() &&
      accountCountryCode !== MARKETPLACE_COUNTRY_CODE
    ) {
      toast({
        title: t("create_ad.city.country_mismatch_title"),
        description: t("create_ad.city.country_mismatch_desc"),
        variant: "destructive",
      });
      form.setError("city", {
        type: "manual",
        message: "create_ad.city.country_mismatch_desc",
      });
      return false;
    }

    if (!cityTrim) {
      toast({
        title: t("create_ad.city.missing_title"),
        description: t("create_ad.city.missing_desc"),
        variant: "destructive",
      });
      form.setError("city", {
        type: "manual",
        message: "create_ad.validation.city_required",
      });
      return false;
    }

    if (!isGermanMarketplaceCity(cityTrim)) {
      toast({
        title: t("create_ad.city.invalid_title"),
        description: t("create_ad.city.invalid_desc"),
        variant: "destructive",
      });
      form.setError("city", {
        type: "manual",
        message: "create_ad.validation.city_not_in_market",
      });
      return false;
    }

    form.clearErrors("city");
    return true;
  }, [accountCountryCode, form, savedMarketCountryCode, toast]);

  const watchTitle = form.watch("title");
  const watchDesc = form.watch("description");
  const watchPriceType = form.watch("priceType");
  const watchCategoryId = form.watch("categoryId");
  const watchSubcategoryId = form.watch("subcategoryId");
  const previewValues = form.watch();

  const selectedCategory = categories?.find((c) => c.id === watchCategoryId);
  const selectedSubcategory = subcategories?.find(
    (s) => s.id === watchSubcategoryId,
  );

  const getMatchingMainApi = (mainName: string) =>
    categories?.find(
      (cat) => normalizeLabel(cat.name) === normalizeLabel(mainName),
    );

  const getMatchingSubApi = (subName: string) =>
    subcategories?.find(
      (sub) => normalizeLabel(sub.name) === normalizeLabel(subName),
    );

  const getDynamicFieldsForPath = (
    path: SelectedCategoryPath | null,
  ): DynamicFieldDef[] => {
    if (!path) return [];
    const main = CATEGORY_TREE.find(
      (item) => normalizeLabel(item.name) === normalizeLabel(path.main),
    );
    if (!main) return [];
    const sub = main.subcategories.find(
      (item) => normalizeLabel(item.name) === normalizeLabel(path.sub),
    );
    if (!sub) return main.dynamicFields ?? [];
    if (!path.leaf) return sub.dynamicFields ?? main.dynamicFields ?? [];
    const leaf = sub.options?.find(
      (item) => normalizeLabel(item.name) === normalizeLabel(path.leaf),
    );
    return leaf?.dynamicFields ?? sub.dynamicFields ?? main.dynamicFields ?? [];
  };

  const activeDynamicFields = getDynamicFieldsForPath(selectedCategoryPath);

  const handleDynamicFieldChange = (fieldId: string, value: string) => {
    setDynamicFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  const toggleShippingTemp = (id: string) => {
    setTempPickupOnly(false);
    setTempShippingIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const renderShippingLogo = (logo: ShippingMethod["logo"]) => {
    if (logo === "dhl") {
      return (
        <svg viewBox="0 0 64 24" className="w-8 h-6 shrink-0" aria-label="DHL">
          <rect x="1" y="1" width="62" height="22" rx="4" fill="#FFCC00" />
          <path d="M7 9h12M6 12h12M5 15h12" stroke="#D40511" strokeWidth="1.5" />
          <text x="22" y="16" fill="#D40511" fontSize="10" fontWeight="700">DHL</text>
        </svg>
      );
    }
    if (logo === "hermes") {
      return (
        <svg viewBox="0 0 64 24" className="w-8 h-6 shrink-0" aria-label="Hermes">
          <rect x="1" y="1" width="62" height="22" rx="4" fill="#0096DB" />
          <path d="M8 7h20l-3 5H11zM12 12h20l-3 5H15z" fill="#fff" opacity="0.95" />
          <text x="34" y="16" fill="#fff" fontSize="8" fontWeight="700">Hermes</text>
        </svg>
      );
    }
    if (logo === "dpd") {
      return (
        <svg viewBox="0 0 64 24" className="w-8 h-6 shrink-0" aria-label="DPD">
          <rect x="1" y="1" width="62" height="22" rx="4" fill="#A61E2D" />
          <path d="M12 12l6-6 6 6-6 6z" fill="#fff" />
          <text x="28" y="16" fill="#fff" fontSize="9" fontWeight="700">DPD</text>
        </svg>
      );
    }
    if (logo === "ups") {
      return (
        <svg viewBox="0 0 64 24" className="w-8 h-6 shrink-0" aria-label="UPS">
          <rect x="1" y="1" width="62" height="22" rx="4" fill="#6B4A1D" />
          <path d="M10 6h14v12H10z" fill="#F6C343" />
          <text x="29" y="16" fill="#F6C343" fontSize="10" fontWeight="700">UPS</text>
        </svg>
      );
    }
    if (logo === "gls") {
      return (
        <svg viewBox="0 0 64 24" className="w-8 h-6 shrink-0" aria-label="GLS">
          <rect x="1" y="1" width="62" height="22" rx="4" fill="#0A2A66" />
          <text x="10" y="16" fill="#fff" fontSize="10" fontWeight="700">GLS</text>
          <circle cx="50" cy="12" r="4" fill="#FFB300" />
        </svg>
      );
    }
    return <Truck className="w-5 h-5 text-primary shrink-0" />;
  };

  const applyCategorySelection = (
    mainName: string,
    subName: string,
    leafName?: string,
  ) => {
    const mainApi = getMatchingMainApi(mainName);
    if (mainApi) {
      form.setValue("categoryId", mainApi.id, { shouldValidate: true });
      setSelectedCatId(mainApi.id);
    } else if (!watchCategoryId && categories?.[0]) {
      form.setValue("categoryId", categories[0].id, { shouldValidate: true });
      setSelectedCatId(categories[0].id);
    }

    const subApi = getMatchingSubApi(subName);
    if (subApi) {
      form.setValue("subcategoryId", subApi.id, { shouldValidate: true });
    } else {
      form.setValue("subcategoryId", null, { shouldValidate: true });
    }

    setSelectedCategoryPath({
      main: mainName,
      sub: subName,
      ...(leafName ? { leaf: leafName } : {}),
    });
    setDynamicFieldValues({});
    setPickerMain(null);
    setPickerSub(null);
    setCategorySheetOpen(false);
  };

  const uploadPendingImages = async () => {
    const uploadJobs: Promise<UploadResult>[] = uploadedImages.map(
      async (src, index) => {
        const pendingFile = pendingImageFilesRef.current[src];
        if (!pendingFile) {
          return { src, remoteUrl: src };
        }

        const rawExt =
          pendingFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileExtension = ALLOWED_IMAGE_EXTENSIONS.includes(rawExt)
          ? rawExt
          : "jpg";
        const result = await uploadFile(pendingFile, {
          folder: "ads",
          userId: user?.id,
          fileExtension,
        });

        if (!result?.publicUrl) {
          throw {
            index,
            file: pendingFile,
            message: "Unknown Supabase upload error",
          };
        }

        return { src, remoteUrl: result.publicUrl };
      },
    );

    try {
      const uploadedResults = await Promise.all(uploadJobs);
      const finalUrls = uploadedResults.map((entry) => entry.remoteUrl);

      uploadedResults.forEach(({ src }) => {
        if (pendingImageFilesRef.current[src]) {
          delete pendingImageFilesRef.current[src];
          URL.revokeObjectURL(src);
        }
      });

      return finalUrls;
    } catch (error) {
      const fileFromThrown = (error as { file?: File })?.file;
      const indexFromThrown = (error as { index?: number })?.index ?? 0;
      const supabaseReason =
        (error as { message?: string })?.message || "Supabase upload failed";
      const fallbackSrc = uploadedImages[indexFromThrown];
      const fallbackFile =
        fileFromThrown ??
        (fallbackSrc ? pendingImageFilesRef.current[fallbackSrc] : undefined);
      const detail: UploadFailureDetail = {
        index: indexFromThrown + 1,
        name: fallbackFile?.name || "unknown",
        type: fallbackFile?.type || "unknown",
        size: fallbackFile?.size || 0,
        reason: supabaseReason,
      };
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console -- image upload failure diagnostics (dev only)
        console.error("Image upload failed", detail);
      }
      const uploadError = new Error(supabaseReason);
      (uploadError as Error & { details?: UploadFailureDetail[] }).details = [
        detail,
      ];
      throw uploadError;
    }
  };

  const onSubmit = async (data: CreateAdFormValues) => {
    if (!validateCityBeforePublish()) {
      return;
    }

    if (!sellerSafetyAccepted) {
      toast({
        title: t("create_ad.safety.accept_required_before_publish"),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmittingUploads(true);
      data.images = await uploadPendingImages();
      setUploadedImages(data.images);
    } catch (error) {
      const details = (
        error as Error & { details?: UploadFailureDetail[] }
      )?.details;
      const firstFailure = details?.[0];
      toast({
        title: t("create_ad.upload.failed"),
        description: firstFailure
          ? `${t("create_ad.upload.failed_file_prefix")} ${firstFailure.name} (${firstFailure.type}, ${formatFileSizeMb(
              firstFailure.size,
            )}) — ${firstFailure.reason}`
          : (error as Error)?.message || t("create_ad.upload.one_or_more_failed"),
        variant: "destructive",
      });
      setIsSubmittingUploads(false);
      return;
    }
    setIsSubmittingUploads(false);

    const detailsPayload = buildAdDetailsPayload({
      specs: dynamicFieldValues,
      categoryPath: selectedCategoryPath ?? undefined,
      currency: selectedCurrency,
      shippingIds,
      pickupOnly,
      directBuy,
      promotionIds: [],
    });
    const adBody = { ...data, details: detailsPayload };

    const invalidate = async () => {
      await queryClient.invalidateQueries({ queryKey: getListMyAdsQueryKey() });
      await queryClient.invalidateQueries({
        queryKey: getListRecommendedAdsQueryKey(),
      });
      if (isEdit) {
        await queryClient.invalidateQueries({
          queryKey: getGetAdQueryKey(editId!),
        });
      }
    };

    if (isEdit) {
      updateAdMutation.mutate(
        { adId: editId!, data: adBody },
        {
          onSuccess: async () => {
            await invalidate();
            toast({
              title: t("create_ad.success.updated"),
            });
            navigate("/profile");
          },
          onError: () => {
            toast({
              title: t("create_ad.error.update"),
              variant: "destructive",
            });
          },
        },
      );
    } else {
      createAdMutation.mutate(
        { data: adBody },
        {
          onSuccess: async () => {
            await invalidate();
            toast({
              title: t("create_ad.success.sent_for_review"),
              description: t("create_ad.success.sent_for_review_desc"),
            });
            navigate("/");
          },
          onError: () => {
            toast({
              title: t("create_ad.error.publish"),
              variant: "destructive",
            });
          },
        },
      );
    }
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files) return;
    if (uploadedImages.length >= MAX_IMAGES) {
      toast({
        title: t("create_ad.images.max_reached", { count: MAX_IMAGES }),
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const availableSlots = MAX_IMAGES - uploadedImages.length;
    const selected = Array.from(files);
    const list = selected.slice(0, availableSlots);

    if (selected.length > availableSlots) {
      toast({
        title: t("create_ad.images.max_upload", { count: MAX_IMAGES }),
        description: t("create_ad.images.ignored_extra", {
          count: selected.length - availableSlots,
        }),
        variant: "destructive",
      });
    }

    for (const file of list) {
      if (!isSupportedImageFile(file)) {
        toast({
          title: t("create_ad.images.unsupported_type"),
          description: t("create_ad.images.unsupported_file", { name: file.name }),
          variant: "destructive",
        });
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        toast({
          title: t("create_ad.images.too_large"),
          description: t("create_ad.images.too_large_file", { name: file.name }),
          variant: "destructive",
        });
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      pendingImageFilesRef.current[previewUrl] = file;
      setUploadedImages((prev) => [...prev, previewUrl]);

      if (user?.id != null) {
        const rawExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileExtension = ALLOWED_IMAGE_EXTENSIONS.includes(rawExt)
          ? rawExt
          : "jpg";
        try {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.log("[create-ad] uploading selected image to API (folder=ads)", {
              hasUserId: true,
            });
          }
          const result = await uploadFile(file, {
            folder: "ads",
            userId: user.id,
            fileExtension,
          });
          if (result?.publicUrl) {
            setUploadedImages((prev) =>
              prev.map((u) => (u === previewUrl ? result.publicUrl : u)),
            );
            delete pendingImageFilesRef.current[previewUrl];
            URL.revokeObjectURL(previewUrl);
          }
        } catch (err) {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.error("[create-ad] immediate image upload failed", err);
          }
          toast({
            title: t("create_ad.upload.single_failed_title"),
            description:
              err instanceof Error ? err.message : t("create_ad.upload.unknown_error"),
            variant: "destructive",
          });
        }
      } else {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log(
            "[create-ad] image preview only — sign in to upload; or upload runs when you publish",
          );
        }
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => {
      const src = prev[index];
      if (src && pendingImageFilesRef.current[src]) {
        delete pendingImageFilesRef.current[src];
        URL.revokeObjectURL(src);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  useEffect(() => {
    return () => {
      Object.keys(pendingImageFilesRef.current).forEach((src) =>
        URL.revokeObjectURL(src),
      );
      pendingImageFilesRef.current = {};
    };
  }, []);

  const handleImproveDescription = () => {
    const currentTitle = form.getValues("title")?.trim() || "";
    const currentDescription = form.getValues("description")?.trim() || "";
    const canImprove =
      currentTitle.length >= 3 || currentDescription.length >= 10;
    if (!canImprove) {
      toast({
        title: t("create_ad.ai.need_title_or_description"),
        variant: "destructive",
      });
      return;
    }

    const original: CreateAdImproveProposal = {
      title: currentTitle,
      description: currentDescription,
    };
    setImproveOriginal(original);
    setImproveProposal(null);
    setImproveDialogOpen(true);

    improveDescMutation.mutate(
      {
        data: {
          title: currentTitle || watchTitle || "إعلان",
          description: currentDescription || "وصف الإعلان",
          category: selectedCategory?.name,
        },
      },
      {
        onSuccess: (res) => {
          setImproveProposal({
            title: res.title?.trim() || original.title,
            description: res.description?.trim() || original.description,
          });
        },
        onError: (err) => {
          setImproveDialogOpen(false);
          const errMsg = err instanceof Error ? err.message : String(err);
          const errProbe = `${err instanceof Error ? err.name : ""} ${errMsg}`;
          const aborted =
            /aborted|timeout|timed out|AbortError/i.test(errProbe);
          if (aborted) {
            toast({
              title: t("create_ad.ai.timeout_title"),
              description: t("create_ad.ai.try_later_short"),
              variant: "destructive",
            });
            return;
          }
          if (
            err instanceof ApiError &&
            (err.status === 502 ||
              err.status === 503 ||
              err.status === 504 ||
              err.status === 500)
          ) {
            toast({
              title: t("create_ad.ai.service_unavailable"),
              variant: "destructive",
            });
            return;
          }
          toast({
            title: t("create_ad.ai.service_unavailable"),
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleApplyImproveProposal = () => {
    if (!improveProposal) return;
    const titleChanged =
      improveProposal.title.trim() !== improveOriginal.title.trim();
    const descChanged =
      improveProposal.description.trim() !==
      improveOriginal.description.trim();
    if (titleChanged) {
      form.setValue("title", improveProposal.title, { shouldValidate: true });
    }
    if (descChanged) {
      form.setValue("description", improveProposal.description, {
        shouldValidate: true,
      });
    }
    setImproveDialogOpen(false);
    setImproveProposal(null);
    if (titleChanged || descChanged) {
      toast({ title: t("create_ad.ai.improved_applied") });
    } else {
      toast({
        title: t("create_ad.ai.description_unchanged_title"),
        description: t("create_ad.ai.description_unchanged_hint"),
      });
    }
  };

  const handleSuggestPrice = () => {
    if (!watchTitle) {
      toast({
        title: t("create_ad.ai.enter_title_first"),
        variant: "destructive",
      });
      return;
    }

    const conditionVal = dynamicFieldValues["condition"]?.trim();
    const storageVal = dynamicFieldValues["storage"]?.trim();
    const descriptionForPrice = [
      watchDesc || "",
      `${t("create_ad.dynamic.condition")}: ${conditionVal || t("create_ad.not_specified")}`,
      `${t("create_ad.dynamic.storage")}: ${storageVal || t("create_ad.not_specified")}`,
    ]
      .filter((line) => line.length > 0)
      .join("\n");

    suggestPriceMutation.mutate(
      {
        data: {
          title: watchTitle,
          description: descriptionForPrice,
          category: selectedCategory?.name,
        },
      },
      {
        onSuccess: (res) => {
          form.setValue("price", res.price, { shouldValidate: true });
          form.setValue("priceType", "negotiable");
          toast({
            title: t("create_ad.price.suggested"),
            description: res.reasoning?.trim() || undefined,
          });
        },
        onError: (err) => {
          const errMsg = err instanceof Error ? err.message : String(err);
          const errProbe = `${err instanceof Error ? err.name : ""} ${errMsg}`;
          const aborted =
            /aborted|timeout|timed out|AbortError/i.test(errProbe);
          if (aborted) {
            toast({
              title: t("create_ad.ai.timeout_title"),
              description: t("create_ad.ai.try_later_short"),
              variant: "destructive",
            });
            return;
          }
          if (
            err instanceof ApiError &&
            (err.status === 502 ||
              err.status === 503 ||
              err.status === 504 ||
              err.status === 500)
          ) {
            toast({
              title: t("create_ad.ai.service_unavailable"),
              variant: "destructive",
            });
            return;
          }
          toast({
            title: t("create_ad.ai.service_unavailable"),
            variant: "destructive",
          });
        },
      },
    );
  };
  const isSubmittingForm =
    createAdMutation.isPending ||
    updateAdMutation.isPending ||
    isSubmittingUploads ||
    isUploading;
  const pathSep = isRtl ? " ← " : " → ";
  const listSep = isRtl ? "، " : ", ";
  const resolvedCategoryPathLabel = selectedCategoryPath
    ? [
        getCreateAdTaxonomyLabel(locale, selectedCategoryPath.main),
        getCreateAdTaxonomyLabel(locale, selectedCategoryPath.sub),
        ...(selectedCategoryPath.leaf
          ? [getCreateAdTaxonomyLabel(locale, selectedCategoryPath.leaf)]
          : []),
      ].join(pathSep)
    : watchCategoryId
      ? [
          getCreateAdTaxonomyLabel(locale, selectedCategory?.name ?? ""),
          ...(selectedSubcategory
            ? [getCreateAdTaxonomyLabel(locale, selectedSubcategory.name)]
            : []),
        ]
          .filter((s) => s.length > 0)
          .join(pathSep)
      : "";
  const selectedShippingLabels = pickupOnly
    ? [t("create_ad.shipping.pickup_only")]
    : shippingMethods.filter((item) => shippingIds.includes(item.id)).map(
        (item) => item.name,
      );
  const shippingSummary =
    selectedShippingLabels.length > 0
      ? selectedShippingLabels.join(listSep)
      : t("create_ad.shipping.note_2");
  const previewShippingLines: string[] = pickupOnly
    ? []
    : selectedShippingLabels.length > 0
      ? selectedShippingLabels
      : [t("create_ad.shipping.note_2")];
  const promotionsPreviewLines: string[] = [];
  const promotePreviewHref = useMemo(() => {
    const ret = isEdit && typeof editId === "number" ? `/edit/${editId}` : "/new";
    return `/promote-preview?return=${encodeURIComponent(ret)}`;
  }, [isEdit, editId]);
  const currencyLabelForPreview =
    CURRENCY_OPTIONS.find((c) => c.id === selectedCurrency)?.label ??
    selectedCurrency;
  const categoryLabelForPreview = getCreateAdTaxonomyLabel(
    locale,
    selectedCategory?.name ?? "",
  );
  const subcategoryLabelForPreview = selectedSubcategory
    ? getCreateAdTaxonomyLabel(locale, selectedSubcategory.name)
    : null;
  const defaultCollapsedShippingIds = [
    "dhl_paket",
    "hermes_packchen",
    "hermes_s_paket",
  ];
  const collapsedShippingMethods = pickupOnly
    ? []
    : (shippingIds.length > 0 ? shippingIds : defaultCollapsedShippingIds)
        .map((id) => shippingMethods.find((method) => method.id === id))
        .filter((method): method is ShippingMethod => Boolean(method));

  useEffect(() => {
    if (!selectedCategoryPath || !selectedCatId || !subcategories?.length) return;
    if (form.getValues("subcategoryId")) return;
    const subApi = getMatchingSubApi(selectedCategoryPath.sub);
    if (subApi) form.setValue("subcategoryId", subApi.id, { shouldValidate: true });
  }, [selectedCategoryPath, selectedCatId, subcategories, form]);

  useEffect(() => {
    if (selectedCategoryPath) return;
    if (!selectedCategory) return;
    const nextPath: SelectedCategoryPath = {
      main: selectedCategory.name,
      sub: selectedSubcategory?.name || "عام",
    };
    setSelectedCategoryPath(nextPath);
  }, [selectedCategoryPath, selectedCategory, selectedSubcategory]);

  useEffect(() => {
    if (!shippingSheetOpen) return;
    setTempShippingIds(shippingIds);
    setTempPickupOnly(pickupOnly);
  }, [shippingSheetOpen, shippingIds, pickupOnly]);

  useEffect(() => {
    const cycleMs = 40_000;
    const visibleMs = 2_000;
    let hideTimeoutId: number | undefined = window.setTimeout(() => {
      setShowAiImproveHint(false);
    }, visibleMs);

    const intervalId = window.setInterval(() => {
      setShowAiImproveHint(true);
      if (hideTimeoutId) window.clearTimeout(hideTimeoutId);
      hideTimeoutId = window.setTimeout(() => {
        setShowAiImproveHint(false);
      }, visibleMs);
    }, cycleMs);

    return () => {
      window.clearInterval(intervalId);
      if (hideTimeoutId) window.clearTimeout(hideTimeoutId);
    };
  }, []);

  return (
    <div className={BOTTOM_NAV_PAGE_SHELL_CLASS}>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="mx-auto flex w-full max-w-[900px] md:max-w-[760px] lg:max-w-[860px] px-4 md:px-6 py-2.5 flex flex-col gap-2.5 md:gap-3 md:py-3"
        >
          <section className="space-y-2" dir={isRtl ? "rtl" : "ltr"}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
            <div className={cn(adCardShell, "space-y-2")}>
              <CreateAdImageGallery
                uploadedImages={uploadedImages}
                maxImages={MAX_IMAGES}
                isSubmittingUploads={isSubmittingUploads || isUploading}
                onPickFiles={() => fileInputRef.current?.click()}
                onRemoveAt={removeImage}
              />
              <p className="text-center text-xs tabular-nums text-zinc-400">
                {t("create_ad.images.count_of_max", {
                  current: uploadedImages.length,
                  max: MAX_IMAGES,
                })}
              </p>
            <Sheet open={photoTipsOpen} onOpenChange={setPhotoTipsOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="self-end text-xs font-medium text-primary hover:underline"
                >
                  {t("create_ad.images.tips_link")}
                </button>
              </SheetTrigger>
              <SheetContent
                hideClose
                side="bottom"
                className={cn(createAdSheetContentBase, "h-auto max-h-[85dvh]")}
                dir={isRtl ? "rtl" : "ltr"}
              >
                <CreateAdSheetHeader title={t("create_ad.images.tips_title")} />
                <div className="space-y-2 px-4 pb-2 pt-1">
                  {[
                    t("create_ad.images.tip_1"),
                    t("create_ad.images.tip_2"),
                    t("create_ad.images.tip_3"),
                    t("create_ad.images.tip_4"),
                    t("create_ad.images.tip_5"),
                  ].map((tip, tipIndex) => (
                    <div
                      key={`photo-tip-${tipIndex}`}
                      className="rounded-lg border border-primary/15 bg-[#0A0A0A]/80 px-2.5 py-1.5"
                    >
                      <p className="text-xs leading-5 text-zinc-300">- {tip}</p>
                    </div>
                  ))}
                </div>
                <div className="px-4 pb-4 pt-1.5">
                  <SheetClose asChild>
                    <Button
                      type="button"
                      className="h-11 w-full rounded-full border border-primary/45 bg-[#0A0A0A]/80 text-base font-semibold text-primary shadow-[0_0_16px_-12px_hsl(var(--primary)/0.35)] transition-colors hover:border-primary/60 hover:bg-black/90 active:opacity-90"
                      onClick={() => setPhotoTipsOpen(false)}
                    >
                      {t("common.got_it")}
                    </Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
            </div>
          </section>

          <div className={adCardShellCompact}>
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-wrap items-center gap-4"
                      dir={isRtl ? "rtl" : "ltr"}
                    >
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="offer" />
                        </FormControl>
                        <FormLabel className="cursor-pointer font-medium">
                          {t("create_ad.type.offer")}
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="request" />
                        </FormControl>
                        <FormLabel className="cursor-pointer font-medium">
                          {t("create_ad.type.request")}
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <section className="space-y-2" dir={isRtl ? "rtl" : "ltr"}>
            <div className={cn(adCardShell, "space-y-1.5")}>
              <FormField
                control={form.control}
                name="title"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className={cn(createAdSectionHeading, "mb-0")}>
                      {t("create_ad.title.heading")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("create_ad.title.placeholder")}
                        className={cn(
                          "h-11 rounded-xl px-3 text-start",
                          adInputClass,
                        )}
                        {...field}
                      />
                    </FormControl>
                    <div className="mt-0.5 text-start text-xs leading-none text-zinc-500">
                      {field.value.length}/65
                    </div>
                    {fieldState.error?.message ? (
                      <p className="text-[0.8rem] font-medium text-destructive text-start">
                        {fieldErrorMsg(fieldState.error.message)}
                      </p>
                    ) : null}
                  </FormItem>
                )}
              />

              <div className="space-y-1.5">
                <label className={cn(createAdSectionHeading, "mb-0 block w-fit text-start")}>
                  {t("create_ad.category.title")}
                </label>
                <p className="min-h-0 text-start text-xs text-primary/90 empty:hidden">
                  {resolvedCategoryPathLabel}
                </p>
                <Sheet open={categorySheetOpen} onOpenChange={setCategorySheetOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-11 w-full justify-between rounded-xl border-primary/35 bg-[#0A0A0A]/80 px-3 text-start font-normal text-foreground hover:border-primary/50 hover:bg-black/90"
                    >
                      <span
                        className={
                          resolvedCategoryPathLabel
                            ? "text-foreground"
                            : "text-zinc-500"
                        }
                      >
                        {resolvedCategoryPathLabel
                          ? t("create_ad.category.change")
                          : t("create_ad.category.choose")}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 rotate-180 text-primary/70" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    hideClose
                    side="bottom"
                    className={cn(createAdSheetContentBase, "h-[80vh] max-h-[90dvh]")}
                    dir={isRtl ? "rtl" : "ltr"}
                  >
                    <CreateAdSheetHeader title={t("create_ad.category.sheet_title")} />
                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-2.5">
                      {!pickerMain ? (
                        CATEGORY_TREE.map((main) => (
                          <button
                            key={main.name}
                            type="button"
                            className="flex w-full items-center justify-between rounded-xl border border-primary/25 bg-[#0A0A0A]/75 px-3 py-3.5 text-start text-white transition-colors hover:border-primary/45 hover:bg-black/85"
                            onClick={() => {
                              setPickerMain(main);
                              setPickerSub(null);
                              const mainApi = getMatchingMainApi(main.name);
                              if (mainApi) setSelectedCatId(mainApi.id);
                            }}
                          >
                            <span className="font-medium">
                              {getCreateAdTaxonomyLabel(locale, main.name)}
                            </span>
                            <ArrowRight className="h-4 w-4 shrink-0 rotate-180 text-primary/70" />
                          </button>
                        ))
                      ) : !pickerSub ? (
                        <>
                          <button
                            type="button"
                            className="mb-1 flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-[#0A0A0A]/85 px-3 py-3 text-start text-sm font-medium text-primary transition-colors hover:border-primary/45 hover:bg-black/90"
                            onClick={() => {
                              setPickerMain(null);
                              setPickerSub(null);
                            }}
                          >
                            <ArrowRight className="h-4 w-4 shrink-0" />
                            {t("create_ad.category.back_to_main")}
                          </button>
                          <p className="px-1 pb-1 text-xs text-zinc-500">
                            {getCreateAdTaxonomyLabel(locale, pickerMain.name)}
                          </p>
                          {pickerMain.subcategories.map((sub) => (
                            <button
                              key={sub.name}
                              type="button"
                              className="flex w-full items-center justify-between rounded-xl border border-primary/25 bg-[#0A0A0A]/75 px-3 py-3.5 text-start text-white transition-colors hover:border-primary/45 hover:bg-black/85"
                              onClick={() => {
                                if (!sub.options?.length) {
                                  applyCategorySelection(pickerMain.name, sub.name);
                                  return;
                                }
                                setPickerSub(sub);
                              }}
                            >
                              <span>{getCreateAdTaxonomyLabel(locale, sub.name)}</span>
                              <ArrowRight className="h-4 w-4 shrink-0 rotate-180 text-primary/70" />
                            </button>
                          ))}
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="mb-1 flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-[#0A0A0A]/85 px-3 py-3 text-start text-sm font-medium text-primary transition-colors hover:border-primary/45 hover:bg-black/90"
                            onClick={() => setPickerSub(null)}
                          >
                            <ArrowRight className="h-4 w-4 shrink-0" />
                            {t("create_ad.category.back_to_main_name", {
                              name: getCreateAdTaxonomyLabel(locale, pickerMain.name),
                            })}
                          </button>
                          <p className="px-1 pb-1 text-xs text-zinc-500">
                            {getCreateAdTaxonomyLabel(locale, pickerMain.name)} →{" "}
                            {getCreateAdTaxonomyLabel(locale, pickerSub.name)}
                          </p>
                          {pickerSub.options?.map((leaf) => (
                            <button
                              key={leaf.name}
                              type="button"
                              className="w-full rounded-xl border border-primary/25 bg-[#0A0A0A]/75 px-3 py-3.5 text-start text-white transition-colors hover:border-primary/45 hover:bg-black/85"
                              onClick={() => {
                                applyCategorySelection(
                                  pickerMain.name,
                                  pickerSub.name,
                                  leaf.name,
                                );
                              }}
                            >
                              {getCreateAdTaxonomyLabel(locale, leaf.name)}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
                {form.formState.errors.categoryId && (
                  <span className="text-xs text-destructive block text-start">
                    {fieldErrorMsg(
                      form.formState.errors.categoryId.message as string | undefined,
                    )}
                  </span>
                )}
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field, fieldState }) => (
                  <FormItem className="space-y-1.5 pb-0">
                    <FormLabel className={cn(createAdSectionHeading, "mb-0")}>
                      {t("create_ad.description.title")}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("create_ad.description.placeholder")}
                        className={cn(
                          "h-[5.5rem] max-h-[104px] min-h-[5rem] resize-none rounded-xl px-3 py-1.5 text-start",
                          adInputClass,
                        )}
                        {...field}
                      />
                    </FormControl>
                    <div className="mt-0.5 text-start text-xs leading-none text-zinc-500">
                      {field.value.length}/4000
                    </div>
                    {fieldState.error?.message ? (
                      <p className="text-[0.8rem] font-medium text-destructive text-start">
                        {fieldErrorMsg(fieldState.error.message)}
                      </p>
                    ) : null}
                  </FormItem>
                )}
              />
            </div>
          </section>

          {activeDynamicFields.length > 0 && (
            <section className="space-y-2" dir={isRtl ? "rtl" : "ltr"}>
              <p className="text-sm font-medium text-foreground">
                {t("create_ad.dynamic.title")}
              </p>
              <div className="grid grid-cols-1 gap-2">
                {activeDynamicFields.map((field) => {
                  const current = dynamicFieldValues[field.id] ?? "";
                  const fieldLabel = getCreateAdTaxonomyLabel(locale, field.label);
                  return (
                    <div key={field.id} className={cn(adCardShellCompact, "px-3 py-2")}>
                      <label className="mb-1 block text-xs text-zinc-400">
                        {fieldLabel}
                      </label>
                      <Sheet>
                        <SheetTrigger asChild>
                          <button
                            type="button"
                            className="flex h-11 w-full items-center justify-between rounded-lg border border-primary/30 bg-[#0A0A0A]/90 px-3 text-sm transition-colors hover:border-primary/45 hover:bg-black/90"
                            dir={isRtl ? "rtl" : "ltr"}
                          >
                            <span
                              className={
                                current ? "text-start text-white" : "text-start text-zinc-500"
                              }
                            >
                              {current
                                ? getCreateAdTaxonomyLabel(locale, current)
                                : t("create_ad.dynamic.choose_field", {
                                    field: fieldLabel,
                                  })}
                            </span>
                            <ArrowRight className="h-4 w-4 shrink-0 rotate-180 text-primary/70" />
                          </button>
                        </SheetTrigger>
                        <SheetContent
                          hideClose
                          side="bottom"
                          className={cn(
                            createAdSheetContentBase,
                            "max-h-[min(85dvh,560px)]",
                          )}
                          dir={isRtl ? "rtl" : "ltr"}
                        >
                          <CreateAdSheetHeader
                            title={t("create_ad.dynamic.choose_field", {
                              field: fieldLabel,
                            })}
                          />
                          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4 pt-1.5">
                            <SheetClose asChild>
                              <button
                                type="button"
                                className="flex w-full items-center justify-between rounded-xl border border-primary/25 bg-[#0A0A0A]/70 px-3 py-3 text-start text-sm text-zinc-400 transition-colors hover:border-primary/35 hover:bg-black/85"
                                onClick={() => handleDynamicFieldChange(field.id, "")}
                              >
                                <span>{t("create_ad.dynamic.clear_selection")}</span>
                              </button>
                            </SheetClose>
                            {field.options?.map((option) => {
                              const selected = current === option;
                              return (
                                <SheetClose key={option} asChild>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDynamicFieldChange(field.id, option)
                                    }
                                    className={cn(
                                      "flex w-full items-center justify-between rounded-xl border px-3 py-3.5 text-start text-white transition-colors",
                                      selected
                                        ? "border-primary bg-primary/15 shadow-[0_0_18px_-10px_hsl(var(--primary)/0.35)]"
                                        : "border-primary/25 bg-[#0A0A0A]/75 hover:border-primary/45 hover:bg-black/85",
                                    )}
                                  >
                                    <span className="font-medium">
                                      {getCreateAdTaxonomyLabel(locale, option)}
                                    </span>
                                    <span
                                      className={cn(
                                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                                        selected
                                          ? "border-primary bg-primary text-black"
                                          : "border-primary/40 bg-transparent",
                                      )}
                                      aria-hidden
                                    >
                                      {selected ? (
                                        <Check className="h-3 w-3" />
                                      ) : null}
                                    </span>
                                  </button>
                                </SheetClose>
                              );
                            })}
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="space-y-1.5" dir={isRtl ? "rtl" : "ltr"}>
            <Sheet open={shippingSheetOpen} onOpenChange={setShippingSheetOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    adCardShellCompact,
                    "w-full py-2.5 text-start transition-colors hover:border-primary/45",
                  )}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className={createAdSectionHeading}>
                      {t("create_ad.shipping.methods_title")}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 rotate-180 text-primary/70" />
                  </div>
                  {pickupOnly ? (
                    <div className="rounded-lg border border-primary/25 bg-[#0A0A0A]/60 px-2.5 py-1.5">
                      <p className="text-sm font-medium">
                        {t("create_ad.shipping.pickup_only")}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {collapsedShippingMethods.map((method) => (
                        <div
                          key={method.id}
                          className="rounded-lg border border-primary/20 bg-[#0A0A0A]/50 px-2.5 py-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="truncate text-sm">{method.name}</span>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {method.compactPrice && (
                                <span className="shrink-0 text-xs text-zinc-500">
                                  {method.compactPrice}
                                </span>
                              )}
                              <span className="flex items-center justify-center">
                                {renderShippingLogo(method.logo)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              </SheetTrigger>
              <SheetContent
                hideClose
                side="bottom"
                className={cn(createAdSheetContentBase, "h-[85vh] max-h-[90dvh] px-0")}
                dir={isRtl ? "rtl" : "ltr"}
              >
                <CreateAdSheetHeader title={t("create_ad.shipping.methods_title")} />
                <div className="flex-1 space-y-2 overflow-y-auto px-4 py-2.5">
                  <div className="space-y-1 rounded-xl border border-primary/25 bg-[#0A0A0A]/70 px-3 py-2 text-xs text-zinc-500">
                    <p>{t("create_ad.shipping.note_1")}</p>
                    <p>{t("create_ad.shipping.note_2")}</p>
                  </div>

                  {shippingMethods.map((method) => {
                    const selected = tempShippingIds.includes(method.id) && !tempPickupOnly;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => toggleShippingTemp(method.id)}
                        className={`w-full rounded-xl border px-3 py-3 text-start transition-colors ${
                          selected
                            ? "border-primary bg-primary/10"
                            : "border-primary/25 bg-[#0A0A0A]/70"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2 min-w-0">
                            <span
                              className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center ${
                                selected
                                  ? "border-primary bg-primary text-black"
                                  : "border-primary/35 text-transparent"
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{method.name}</p>
                              <p className="mt-0.5 text-xs text-zinc-500">
                                {method.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {method.priceText && (
                              <span className="shrink-0 text-xs text-zinc-500">
                                {method.priceText}
                              </span>
                            )}
                            <span className="flex items-center justify-center mt-0.5">
                              {renderShippingLogo(method.logo)}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      setTempPickupOnly(true);
                      setTempShippingIds([]);
                    }}
                    className={`w-full rounded-xl border px-3 py-3 text-start transition-colors ${
                      tempPickupOnly
                        ? "border-primary bg-primary/10"
                        : "border-primary/25 bg-[#0A0A0A]/70"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-5 h-5 rounded border flex items-center justify-center ${
                          tempPickupOnly
                            ? "border-primary bg-primary text-black"
                            : "border-primary/35 text-transparent"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </span>
                      <span className="font-medium">
                        {t("create_ad.shipping.no_shipping_pickup_only")}
                      </span>
                    </div>
                  </button>
                </div>
                <div className="border-t border-primary/20 p-3">
                  <button
                    type="button"
                    className={cn(
                      SETTINGS_PRIMARY_BUTTON,
                      "!min-h-11 rounded-xl py-2.5 text-sm",
                    )}
                    onClick={() => {
                      setPickupOnly(tempPickupOnly);
                      setShippingIds(tempPickupOnly ? [] : tempShippingIds);
                      setShippingSheetOpen(false);
                    }}
                  >
                    {t("common.confirm")}
                  </button>
                </div>
              </SheetContent>
            </Sheet>
            <p className="px-1 text-xs text-zinc-500">
              {t("create_ad.shipping.footer_note")}
            </p>
          </section>

          <section className="space-y-1.5" dir={isRtl ? "rtl" : "ltr"}>
            <div className={cn(adCardShell, "space-y-1.5")}>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-primary/25 bg-[#0A0A0A]/60 p-2">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field, fieldState }) => (
                      <FormItem className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 mb-0">
                          <FormLabel className={cn(createAdSectionHeading, "mb-0")}>
                            {t("create_ad.price.title")}
                          </FormLabel>
                          {watchTitle && watchPriceType !== "free" && (
                            <button
                              type="button"
                              onClick={handleSuggestPrice}
                              disabled={suggestPriceMutation.isPending}
                              className="text-xs font-medium text-primary flex items-center gap-1 hover:underline disabled:opacity-50"
                            >
                              {suggestPriceMutation.isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Sparkles className="w-3 h-3" />
                              )}
                              {t("create_ad.price.suggest_price_btn")}
                            </button>
                          )}
                        </div>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder={t("create_ad.price.amount")}
                            className={cn(
                              "h-11 rounded-xl text-start",
                              adInputClass,
                            )}
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value ? Number(e.target.value) : null,
                              )
                            }
                            disabled={
                              watchPriceType === "free" || watchPriceType === "swap"
                            }
                          />
                        </FormControl>
                        {fieldState.error?.message ? (
                          <p className="text-[0.8rem] font-medium text-destructive text-start">
                            {fieldErrorMsg(fieldState.error.message)}
                          </p>
                        ) : null}
                      </FormItem>
                    )}
                  />
                </div>

                <div className="rounded-xl border border-primary/25 bg-[#0A0A0A]/60 p-2">
                  <div className="space-y-1.5">
                    <label className={cn(createAdSectionHeading, "mb-0 block w-fit text-start")}>
                      {t("create_ad.price.currency")}
                    </label>
                    <Sheet
                      open={currencySheetOpen}
                      onOpenChange={setCurrencySheetOpen}
                    >
                      <SheetTrigger asChild>
                        <button
                          type="button"
                          className="flex h-11 w-full items-center justify-between rounded-xl border border-primary/35 bg-[#0A0A0A]/80 px-3 text-sm text-foreground hover:border-primary/50"
                        >
                          <span>
                            {CURRENCY_OPTIONS.find(
                              (item) => item.id === selectedCurrency,
                            )?.label || "EUR (€)"}
                          </span>
                          <ArrowRight className="h-4 w-4 rotate-180 text-primary/70" />
                        </button>
                      </SheetTrigger>
                      <SheetContent
                        hideClose
                        side="bottom"
                        className={cn(createAdSheetContentBase, "h-auto max-h-[85dvh]")}
                        dir={isRtl ? "rtl" : "ltr"}
                      >
                        <CreateAdSheetHeader title={t("create_ad.price.choose_currency")} />
                        <div className="space-y-2 overflow-y-auto px-4 pb-4 pt-1.5">
                          {CURRENCY_OPTIONS.map((currency) => {
                            const picked = selectedCurrency === currency.id;
                            return (
                              <button
                                key={currency.id}
                                type="button"
                                className={cn(
                                  "flex w-full items-center justify-between rounded-xl border px-3 py-3.5 text-start text-white transition-colors",
                                  picked
                                    ? "border-primary bg-primary/15 shadow-[0_0_18px_-10px_hsl(var(--primary)/0.35)]"
                                    : "border-primary/25 bg-[#0A0A0A]/75 hover:border-primary/45 hover:bg-black/85",
                                )}
                                onClick={() => {
                                  setSelectedCurrency(currency.id);
                                  setCurrencySheetOpen(false);
                                }}
                              >
                                <span className="font-medium">{currency.label}</span>
                                {picked ? (
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-primary bg-primary text-black">
                                    <Check className="h-3 w-3" />
                                  </span>
                                ) : (
                                  <span
                                    className="h-5 w-5 shrink-0 rounded-full border border-primary/40"
                                    aria-hidden
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </SheetContent>
                    </Sheet>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-primary/25 bg-[#0A0A0A]/60 p-2">
                <FormField
                  control={form.control}
                  name="priceType"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className={cn(createAdSectionHeading, "mb-0 block w-fit text-start")}>
                        {t("create_ad.price.type")}
                      </FormLabel>
                      <Sheet
                        open={priceTypeSheetOpen}
                        onOpenChange={setPriceTypeSheetOpen}
                      >
                        <SheetTrigger asChild>
                          <button
                            type="button"
                            className="flex h-11 w-full items-center justify-between rounded-xl border border-primary/35 bg-[#0A0A0A]/80 px-3 text-sm text-foreground hover:border-primary/50"
                          >
                            <span>
                              {field.value === "fixed" &&
                                t("create_ad.price_type.fixed")}
                              {field.value === "negotiable" &&
                                t("create_ad.price_type.negotiable")}
                              {field.value === "free" &&
                                t("create_ad.price_type.free")}
                              {field.value === "swap" &&
                                t("create_ad.price_type.swap")}
                            </span>
                            <ArrowRight className="h-4 w-4 rotate-180 text-primary/70" />
                          </button>
                        </SheetTrigger>
                        <SheetContent
                          hideClose
                          side="bottom"
                          className={cn(createAdSheetContentBase, "h-auto max-h-[85dvh]")}
                          dir={isRtl ? "rtl" : "ltr"}
                        >
                          <CreateAdSheetHeader title={t("create_ad.price.choose_type")} />
                          <div className="space-y-2 overflow-y-auto px-4 pb-4 pt-1.5">
                            {(
                              [
                                { id: "fixed", labelKey: "create_ad.price_type.fixed" },
                                {
                                  id: "negotiable",
                                  labelKey: "create_ad.price_type.negotiable",
                                },
                                { id: "free", labelKey: "create_ad.price_type.free" },
                                { id: "swap", labelKey: "create_ad.price_type.swap" },
                              ] as const
                            ).map((pt) => {
                              const picked = field.value === pt.id;
                              return (
                                <button
                                  key={pt.id}
                                  type="button"
                                  className={cn(
                                    "flex w-full items-center justify-between rounded-xl border px-3 py-3.5 text-start text-white transition-colors",
                                    picked
                                      ? "border-primary bg-primary/15 shadow-[0_0_18px_-10px_hsl(var(--primary)/0.35)]"
                                      : "border-primary/25 bg-[#0A0A0A]/75 hover:border-primary/45 hover:bg-black/85",
                                  )}
                                  onClick={() => {
                                    field.onChange(pt.id);
                                    if (pt.id === "free") {
                                      form.setValue("price", 0, {
                                        shouldValidate: true,
                                      });
                                    }
                                    setPriceTypeSheetOpen(false);
                                  }}
                                >
                                  <span className="font-medium">{t(pt.labelKey)}</span>
                                  {picked ? (
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-primary bg-primary text-black">
                                      <Check className="h-3 w-3" />
                                    </span>
                                  ) : (
                                    <span
                                      className="h-5 w-5 shrink-0 rounded-full border border-primary/40"
                                      aria-hidden
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </SheetContent>
                      </Sheet>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </section>

          <section className="space-y-1.5" dir={isRtl ? "rtl" : "ltr"}>
            <label className={cn(createAdSectionHeading, "mb-0 block w-fit text-start")}>
              {t("create_ad.direct_buy.title")}
            </label>
            <div className={cn(adCardShellCompact, "space-y-1.5")}>
              <RadioGroup
                value={directBuy}
                onValueChange={(value) => setDirectBuy(value as "yes" | "no")}
                className="space-y-1.5"
                dir={isRtl ? "rtl" : "ltr"}
              >
                <div className="space-y-1.5">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-primary/25 bg-[#0A0A0A]/60 px-3 py-2">
                    <RadioGroupItem
                      value="yes"
                      className="data-[state=checked]:border-primary [&>span>svg]:fill-primary"
                    />
                    <span className="text-sm text-start">
                      {t("create_ad.direct_buy.yes")}
                    </span>
                  </label>
                  {directBuy === "yes" && (
                    <div className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs leading-snug text-foreground/90 space-y-1">
                      <p>{t("create_ad.direct_buy.yes_note_1")}</p>
                      <p>{t("create_ad.direct_buy.yes_note_2")}</p>
                      <p>{t("create_ad.direct_buy.yes_note_3")}</p>
                    </div>
                  )}
                </div>

                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-primary/25 bg-[#0A0A0A]/60 px-3 py-2">
                  <RadioGroupItem
                    value="no"
                    className="data-[state=checked]:border-primary [&>span>svg]:fill-primary"
                  />
                  <span className="text-sm text-start">
                    {t("create_ad.direct_buy.no")}
                  </span>
                </label>
              </RadioGroup>
            </div>
          </section>

          <section className="space-y-1.5" dir={isRtl ? "rtl" : "ltr"}>
            <label className={cn(createAdSectionHeading, "mb-0 block w-fit text-start")}>
              {t("create_ad.promotion.title")}
            </label>
            <CreateAdPromotionTeaser isRtl={isRtl} previewHref={promotePreviewHref} />
          </section>

          <section className="space-y-1.5" dir={isRtl ? "rtl" : "ltr"}>
            <div className="space-y-1.5">
              <label className={cn(createAdSectionHeading, "mb-0 block w-fit text-start")}>
                {t("create_ad.contact.title")}
              </label>
              <div className={cn(adCardShell, "space-y-2")}>
                <FormField
                  control={form.control}
                  name="sellerName"
                  render={({ field, fieldState }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="block text-start text-xs text-zinc-400">
                        {t("create_ad.contact.name")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("create_ad.contact.name_placeholder")}
                          className={cn(
                            "h-11 rounded-xl text-start",
                            adInputClass,
                          )}
                          {...field}
                        />
                      </FormControl>
                      {fieldState.error?.message ? (
                        <p className="text-[0.8rem] font-medium text-destructive text-start">
                          {fieldErrorMsg(fieldState.error.message)}
                        </p>
                      ) : null}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sellerPhone"
                  render={({ field, fieldState }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="block text-start text-xs text-zinc-400">
                        {t("create_ad.contact.phone")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder={t("create_ad.contact.phone_placeholder")}
                          dir="ltr"
                          className={cn(
                            "h-11 rounded-xl text-start",
                            adInputClass,
                          )}
                          {...field}
                        />
                      </FormControl>
                      {fieldState.error?.message ? (
                        <p className="text-[0.8rem] font-medium text-destructive text-start">
                          {fieldErrorMsg(fieldState.error.message)}
                        </p>
                      ) : null}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field, fieldState }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="block text-start text-xs text-zinc-400">
                        {t("create_ad.contact.city")}
                      </FormLabel>
                      <FormControl>
                        <CitySelect
                          value={field.value || ""}
                          onChange={field.onChange}
                          placeholder={t("create_ad.contact.city_placeholder")}
                          className={cn(
                            "h-11 rounded-xl py-2 hover:bg-black/90",
                            adInputClass,
                          )}
                        />
                      </FormControl>
                      {fieldState.error?.message ? (
                        <p className="text-[0.8rem] font-medium text-destructive text-start">
                          {fieldErrorMsg(fieldState.error.message)}
                        </p>
                      ) : null}
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </section>

          <section className="space-y-1.5" dir={isRtl ? "rtl" : "ltr"}>
            <div className={cn(adCardShellCompact, "space-y-1.5")}>
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-2">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span className={createAdSectionHeading}>
                    {t("create_ad.safety.card_title")}
                  </span>
                </div>
                <p
                  className={cn(
                    "text-[11px] leading-4.5 text-foreground/85 transition-all",
                    safetyNoticeExpanded ? "line-clamp-none" : "line-clamp-1",
                  )}
                >
                  {t("create_ad.safety.seller_card_body")}
                </p>
                <button
                  type="button"
                  className="mt-1 text-xs font-medium text-primary hover:underline"
                  onClick={() => setSafetyNoticeExpanded((prev) => !prev)}
                >
                  {safetyNoticeExpanded
                    ? t("create_ad.show_less")
                    : t("create_ad.show_more")}
                </button>
              </div>

              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-primary/25 bg-[#0A0A0A]/60 px-2.5 py-2">
                <input
                  type="checkbox"
                  checked={sellerSafetyAccepted}
                  onChange={(e) => setSellerSafetyAccepted(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 accent-primary"
                />
                <span className="text-[11px] leading-4.5 text-foreground/90">
                  {t("create_ad.safety.checkbox")}
                </span>
              </label>
            </div>
          </section>

          <div className="space-y-2 pt-1">
            <Button
              type="submit"
              className="h-11 w-full rounded-full border border-primary/45 bg-[#0A0A0A]/80 text-base font-bold text-primary shadow-[0_0_16px_-12px_hsl(var(--primary)/0.35)] transition-colors hover:border-primary/60 hover:bg-black/90 active:opacity-90"
              disabled={isSubmittingForm}
            >
              {isSubmittingForm ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEdit
                    ? t("create_ad.loading.saving")
                    : t("create_ad.loading.publishing")}
                </span>
              ) : isEdit ? (
                t("create_ad.save_changes")
              ) : (
                t("create_ad.publish")
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-full border-primary/40 bg-[#0A0A0A]/80 text-base font-semibold text-foreground shadow-[0_0_16px_-12px_hsl(var(--primary)/0.3)] transition-colors hover:border-primary/55 hover:bg-black/90 active:opacity-90"
              onClick={() => {
                void form.trigger("city").then((ok) => {
                  if (!ok || !validateCityBeforePublish()) return;
                  setPreviewOpen(true);
                });
              }}
            >
              {t("create_ad.preview")}
            </Button>
          </div>

          <div aria-hidden className={createAdScrollEndSpacer} />
        </form>
      </Form>

      <CreateAdPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        isEdit={isEdit}
        values={{
          title: previewValues.title,
          description: previewValues.description,
          price: previewValues.price,
          priceType: previewValues.priceType,
          type: previewValues.type,
          categoryId: previewValues.categoryId,
          subcategoryId: previewValues.subcategoryId ?? null,
          city: previewValues.city,
          sellerName: previewValues.sellerName,
          sellerPhone: previewValues.sellerPhone,
        }}
        previewImages={uploadedImages}
        categoryLabel={categoryLabelForPreview}
        subcategoryLabel={subcategoryLabelForPreview}
        categoryPathLabel={resolvedCategoryPathLabel}
        shippingSummary={previewShippingLines}
        promotionsSummary={promotionsPreviewLines}
        pickupOnly={pickupOnly}
        currencyLabel={currencyLabelForPreview}
        sellerSafetyAccepted={sellerSafetyAccepted}
        isSubmitting={isSubmittingForm}
        onBackToEdit={() => setPreviewOpen(false)}
        onPublish={() => {
          void form.handleSubmit(onSubmit)();
        }}
      />

      <CreateAdImproveDialog
        open={improveDialogOpen}
        onOpenChange={(open) => {
          setImproveDialogOpen(open);
          if (!open) setImproveProposal(null);
        }}
        original={improveOriginal}
        proposal={improveProposal}
        isLoading={improveDescMutation.isPending}
        onApply={handleApplyImproveProposal}
      />

      <CreateAdDraggableAiFab
        onImprove={handleImproveDescription}
        isPending={improveDescMutation.isPending}
        showHint={showAiImproveHint}
      />
    </div>
  );
}
