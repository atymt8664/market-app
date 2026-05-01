import { Link } from "wouter";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function PrivacyPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[100dvh] w-full flex-col bg-gradient-to-b from-background to-muted/30"
      dir="rtl"
    >
      <header className="sticky top-0 z-40 flex items-center gap-4 border-b border-border bg-background/90 p-4 backdrop-blur">
        <Link href="/signup">
          <button
            type="button"
            className="rounded-full p-2 -mr-2 transition-all hover:bg-muted active:scale-95"
            aria-label="رجوع"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </Link>
        <h1 className="font-bold text-lg">سياسة الخصوصية</h1>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pb-10 pt-6 sm:px-6">
        <div className="rounded-2xl border border-primary/20 bg-card/70 p-5 shadow-[0_0_0_1px_rgba(182,227,86,0.05),0_12px_28px_-16px_rgba(182,227,86,0.35)]">
          <h2 className="text-base font-semibold text-foreground">ما البيانات التي نجمعها</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            نجمع البيانات الأساسية اللازمة لتشغيل الخدمة، مثل الاسم، البريد الإلكتروني، رقم
            الهاتف، ومعلومات الإعلانات التي ينشرها المستخدم. كما قد نجمع بيانات تقنية محدودة
            لتحسين الأداء وتجربة الاستخدام.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-background/80 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">كيف نستخدم البيانات</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            نستخدم البيانات لتقديم خدمات المنصة، التحقق من الحسابات، تحسين البحث والإعلانات،
            وتقديم الدعم الفني وحماية المستخدمين من إساءة الاستخدام. لا يتم استخدام البيانات خارج
            نطاق الخدمة المعلنة.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-background/80 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">حماية البيانات</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            نطبق إجراءات حماية تقنية وتنظيمية مناسبة لتقليل مخاطر الوصول غير المصرح به أو التسريب
            أو التعديل غير القانوني للبيانات. كما نراجع إجراءات الأمان بشكل دوري حسب متطلبات
            التشغيل.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-background/80 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">
            عدم مشاركة البيانات مع أطراف خارجية
          </h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            لا نقوم ببيع أو مشاركة بياناتك الشخصية مع أطراف خارجية لأغراض تسويقية. أي مشاركة
            محدودة تكون فقط عند الضرورة التشغيلية أو الالتزام القانوني وبالحد الأدنى المطلوب.
          </p>
          <a
            href="mailto:support@souq-arab.eu"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 rounded-lg border border-primary/30 px-3 py-2 text-sm font-medium text-primary transition hover:border-primary hover:bg-primary/10 hover:underline"
          >
            فتح البريد الخاص بالخصوصية
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

