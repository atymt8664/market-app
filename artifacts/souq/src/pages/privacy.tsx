import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { LegalDocumentHeader } from "@/components/legal-document-header";
import { SETTINGS_CARD, SETTINGS_MAIN_COLUMN, SETTINGS_PAGE_BG } from "@/components/settings-shell";

export default function PrivacyPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full flex-col ${SETTINGS_PAGE_BG}`}
      dir="rtl"
    >
      <LegalDocumentHeader title="سياسة الخصوصية" />

      <div className={`${SETTINGS_MAIN_COLUMN} flex-1 pb-10`}>
        <div className={SETTINGS_CARD}>
          <h2 className="text-base font-semibold text-foreground">ما البيانات التي نجمعها</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            نجمع البيانات الأساسية اللازمة لتشغيل الخدمة، مثل الاسم، البريد الإلكتروني، رقم
            الهاتف، ومعلومات الإعلانات التي ينشرها المستخدم. كما قد نجمع بيانات تقنية محدودة
            لتحسين الأداء وتجربة الاستخدام.
          </p>
        </div>

        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">كيف نستخدم البيانات</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            نستخدم البيانات لتقديم خدمات المنصة، التحقق من الحسابات، تحسين البحث والإعلانات،
            وتقديم الدعم الفني وحماية المستخدمين من إساءة الاستخدام. لا يتم استخدام البيانات خارج
            نطاق الخدمة المعلنة.
          </p>
        </div>

        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">حماية البيانات</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            نطبق إجراءات حماية تقنية وتنظيمية مناسبة لتقليل مخاطر الوصول غير المصرح به أو التسريب
            أو التعديل غير القانوني للبيانات. كما نراجع إجراءات الأمان بشكل دوري حسب متطلبات
            التشغيل.
          </p>
        </div>

        <div className={SETTINGS_CARD}>
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

