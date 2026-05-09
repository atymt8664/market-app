import { useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Heart,
  Image as ImageIcon,
  MessageSquare,
  Newspaper,
  Settings as SettingsIcon,
  ShieldCheck,
  Trash2,
  UserCircle,
} from "lucide-react";
import {
  SETTINGS_BACK_BUTTON,
  SETTINGS_CARD,
  SETTINGS_HEADER_BAR,
  SETTINGS_HEADER_INNER,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_MAIN_COLUMN,
  SETTINGS_PAGE_BG,
  SETTINGS_PAGE_TITLE,
} from "@/components/settings-shell";

const SUPPORT_EMAIL = "souqarab.market@gmail.com";
const PAGE_TITLE = "Delete Your Account · Souq Arab EU | حذف الحساب";
const PAGE_DESCRIPTION =
  "How to permanently delete your Souq Arab EU account, profile, ads, favorites, chats and uploaded images directly from inside the app. كيفية حذف حسابك من تطبيق سوق العرب EU.";
const PAGE_URL = "https://www.souq-arab.com/delete-account";

type DeletedItem = {
  icon: React.ReactNode;
  en: string;
  ar: string;
};

const DELETED_ITEMS: DeletedItem[] = [
  {
    icon: <UserCircle className="h-4 w-4" />,
    en: "Your profile (name, email, phone, avatar, account metadata)",
    ar: "ملفك الشخصي (الاسم، البريد، رقم الهاتف، الصورة، بيانات الحساب)",
  },
  {
    icon: <Newspaper className="h-4 w-4" />,
    en: "All ads / listings you published",
    ar: "جميع إعلاناتك المنشورة على المنصة",
  },
  {
    icon: <Heart className="h-4 w-4" />,
    en: "Your favorites and likes",
    ar: "المفضلة والإعجابات المرتبطة بحسابك",
  },
  {
    icon: <MessageSquare className="h-4 w-4" />,
    en: "Your chats and messages with other users",
    ar: "المحادثات والرسائل المرتبطة بحسابك",
  },
  {
    icon: <ImageIcon className="h-4 w-4" />,
    en: "Images you uploaded (ad photos, profile picture)",
    ar: "الصور التي قمت برفعها (صور الإعلانات والصورة الشخصية)",
  },
];

const STEPS: { en: string; ar: string }[] = [
  {
    en: "Open the Souq Arab EU app and sign in to your account.",
    ar: "افتح تطبيق سوق العرب EU وسجّل الدخول إلى حسابك.",
  },
  {
    en: "Go to Profile → Settings.",
    ar: "افتح ملفي → الإعدادات.",
  },
  {
    en: "Scroll to the bottom and tap Delete Account.",
    ar: "انتقل إلى أسفل الصفحة واضغط على «حذف الحساب».",
  },
  {
    en: "Confirm by entering your current password.",
    ar: "أكّد العملية عبر إدخال كلمة المرور الحالية.",
  },
  {
    en: "Your account and the data listed above are removed permanently.",
    ar: "يتم حذف الحساب والبيانات المذكورة أعلاه بشكل دائم.",
  },
];

function applySeoMeta() {
  if (typeof document === "undefined") return () => {};
  const previousTitle = document.title;
  document.title = PAGE_TITLE;

  const ensureMeta = (selector: string, attrName: "name" | "property", attrValue: string) => {
    let el = document.head.querySelector<HTMLMetaElement>(selector);
    let created = false;
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attrName, attrValue);
      document.head.appendChild(el);
      created = true;
    }
    const previousContent = el.getAttribute("content");
    return { el, created, previousContent };
  };

  const desc = ensureMeta('meta[name="description"]', "name", "description");
  desc.el.setAttribute("content", PAGE_DESCRIPTION);

  const ogTitle = ensureMeta('meta[property="og:title"]', "property", "og:title");
  ogTitle.el.setAttribute("content", PAGE_TITLE);

  const ogDesc = ensureMeta('meta[property="og:description"]', "property", "og:description");
  ogDesc.el.setAttribute("content", PAGE_DESCRIPTION);

  const ogUrl = ensureMeta('meta[property="og:url"]', "property", "og:url");
  ogUrl.el.setAttribute("content", PAGE_URL);

  const robots = ensureMeta('meta[name="robots"]', "name", "robots");
  robots.el.setAttribute("content", "index,follow");

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  let canonicalCreated = false;
  let previousCanonicalHref: string | null = null;
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
    canonicalCreated = true;
  } else {
    previousCanonicalHref = canonical.getAttribute("href");
  }
  canonical.setAttribute("href", PAGE_URL);

  return () => {
    document.title = previousTitle;
    const restore = (entry: { el: HTMLMetaElement; created: boolean; previousContent: string | null }) => {
      if (entry.created) {
        entry.el.remove();
      } else if (entry.previousContent !== null) {
        entry.el.setAttribute("content", entry.previousContent);
      }
    };
    restore(desc);
    restore(ogTitle);
    restore(ogDesc);
    restore(ogUrl);
    restore(robots);
    if (canonical) {
      if (canonicalCreated) {
        canonical.remove();
      } else if (previousCanonicalHref !== null) {
        canonical.setAttribute("href", previousCanonicalHref);
      }
    }
  };
}

export default function DeleteAccountPage() {
  useEffect(() => {
    const cleanup = applySeoMeta();
    return cleanup;
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full flex-col ${SETTINGS_PAGE_BG}`}
      dir="ltr"
    >
      <header className={SETTINGS_HEADER_BAR} dir="ltr">
        <div className={SETTINGS_HEADER_INNER}>
          <Link href="/" className="shrink-0">
            <button type="button" className={SETTINGS_BACK_BUTTON} aria-label="Souq Arab EU home">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em]">EU</span>
            </button>
          </Link>
          <h1 className={SETTINGS_PAGE_TITLE} style={{ textAlign: "left" }}>
            Delete Account
          </h1>
        </div>
      </header>

      <div className={`${SETTINGS_MAIN_COLUMN} flex-1 ${SETTINGS_IMMERSIVE_BOTTOM}`}>
        {/* Hero card */}
        <div className={SETTINGS_CARD}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/45 bg-red-950/35 text-red-200 shadow-[0_0_18px_-12px_rgba(248,113,113,0.55)]">
              <Trash2 className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-foreground">
                Delete your Souq Arab EU account
              </h2>
              <p className="mt-1 text-xs font-medium text-muted-foreground" dir="rtl">
                حذف حسابك في سوق العرب EU بشكل دائم
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            You can permanently delete your Souq Arab EU account directly inside the app — no
            external request or support ticket is required. This page explains the in-app
            deletion path and what data is removed.
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground" dir="rtl">
            يمكنك حذف حسابك في تطبيق سوق العرب EU مباشرةً من داخل التطبيق دون الحاجة إلى التواصل مع
            الدعم. تشرح هذه الصفحة خطوات الحذف من داخل التطبيق والبيانات التي يتم حذفها.
          </p>
        </div>

        {/* In-app path — primary call to action */}
        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">
            How to delete your account from inside the app
          </h3>
          <p className="mt-1 text-xs font-medium text-muted-foreground" dir="rtl">
            كيفية حذف الحساب من داخل التطبيق
          </p>

          <div className="mt-4 flex flex-col gap-2 rounded-xl border border-primary/35 bg-zinc-950/70 p-3 shadow-[0_0_18px_-14px_hsl(var(--primary)/0.22)] ring-1 ring-primary/12">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <SettingsIcon className="h-4 w-4" aria-hidden />
              <span>Settings → Delete Account</span>
            </div>
            <div className="text-xs font-medium text-muted-foreground" dir="rtl">
              الإعدادات → حذف الحساب
            </div>
          </div>

          <ol className="mt-4 list-decimal space-y-2 ps-5 text-sm leading-7 text-muted-foreground marker:font-semibold marker:text-primary/80">
            {STEPS.map((step) => (
              <li key={step.en}>
                <span className="block">{step.en}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground/85" dir="rtl">
                  {step.ar}
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Data deleted */}
        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">What gets deleted</h3>
          <p className="mt-1 text-xs font-medium text-muted-foreground" dir="rtl">
            البيانات التي يتم حذفها
          </p>

          <ul className="mt-4 flex flex-col gap-2">
            {DELETED_ITEMS.map((item) => (
              <li
                key={item.en}
                className="flex items-start gap-3 rounded-xl border border-primary/25 bg-zinc-950/75 px-3 py-3 shadow-[0_0_20px_-14px_hsl(var(--primary)/0.14)] ring-1 ring-primary/10"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/35 bg-zinc-950/80 text-primary">
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{item.en}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground" dir="rtl">
                    {item.ar}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Account deletion is permanent and cannot be undone after it has been confirmed inside
            the app.
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground" dir="rtl">
            حذف الحساب إجراء دائم ولا يمكن التراجع عنه بعد تأكيد العملية داخل التطبيق.
          </p>
        </div>

        {/* Retention notice */}
        <div className={SETTINGS_CARD}>
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-zinc-950/80 text-primary">
              <ShieldCheck className="h-4 w-4" aria-hidden />
            </span>
            <h3 className="text-sm font-semibold text-foreground">
              Security &amp; legal log retention
            </h3>
          </div>
          <p className="mt-1 text-xs font-medium text-muted-foreground" dir="rtl">
            الاحتفاظ بسجلات الأمان والامتثال القانوني
          </p>

          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            For abuse prevention, fraud detection and to comply with applicable EU regulations,
            limited security and administrative logs may be retained temporarily after deletion.
            These records are kept without direct personal identifiers wherever possible and only
            for as long as legally necessary.
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground" dir="rtl">
            لأغراض الأمان ومنع إساءة الاستخدام والامتثال للأنظمة المعمول بها في الاتحاد الأوروبي،
            قد يتم الاحتفاظ مؤقتاً بسجلات أمنية وإدارية محدودة بعد الحذف. تُحفظ هذه السجلات بدون
            بيانات شخصية مباشرة قدر الإمكان وللمدة اللازمة قانونياً فقط.
          </p>
        </div>

        {/* Support */}
        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">Need help?</h3>
          <p className="mt-1 text-xs font-medium text-muted-foreground" dir="rtl">
            هل تحتاج إلى مساعدة؟
          </p>

          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            If you are unable to access your account or you cannot complete the in-app deletion
            for any reason, contact our support team and we will help you remove your account.
          </p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground" dir="rtl">
            إذا تعذّر عليك الوصول إلى حسابك أو إكمال الحذف من داخل التطبيق لأي سبب، يمكنك التواصل
            مع فريق الدعم وسنقوم بمساعدتك على حذف الحساب.
          </p>

          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Account deletion request")}`}
            className="mt-4 inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-zinc-950/80 px-3 py-2 text-sm font-medium text-primary shadow-[0_0_18px_-14px_hsl(var(--primary)/0.28)] ring-1 ring-primary/15 transition hover:border-primary/55 hover:bg-zinc-900/95 hover:underline"
          >
            <span dir="ltr">{SUPPORT_EMAIL}</span>
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </a>
        </div>

        {/* Footer / branding */}
        <div className="pt-2 pb-4 text-center text-[11px] leading-relaxed text-muted-foreground/85">
          <p>
            Souq Arab EU · Account deletion notice · Last updated{" "}
            {new Date().getFullYear()}
          </p>
          <p className="mt-1" dir="rtl">
            سوق العرب EU · صفحة حذف الحساب
          </p>
        </div>
      </div>
    </motion.div>
  );
}
