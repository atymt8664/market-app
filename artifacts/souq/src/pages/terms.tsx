import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { LegalDocumentHeader } from "@/components/legal-document-header";
import { SETTINGS_CARD, SETTINGS_MAIN_COLUMN, SETTINGS_PAGE_BG } from "@/components/settings-shell";

export default function TermsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full flex-col ${SETTINGS_PAGE_BG}`}
      dir="rtl"
    >
      <LegalDocumentHeader title="الشروط والأحكام" />

      <div className={`${SETTINGS_MAIN_COLUMN} flex-1 pb-10`}>
        <div className={SETTINGS_CARD}>
          <h2 className="text-base font-semibold text-foreground">وصف استخدام التطبيق</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            منصة سوق العرب EU مخصصة لعرض الإعلانات والتواصل بين البائعين والمشترين بشكل آمن
            ومنظّم. باستخدامك للتطبيق، فأنت توافق على الالتزام بالقوانين المحلية، وعدم استخدام
            الخدمة لأي نشاط غير مشروع أو مضلل.
          </p>
        </div>

        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">مسؤولية المستخدم</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            المستخدم مسؤول بشكل كامل عن دقة بيانات الحساب، وصحة محتوى الإعلان، وسلامة التعامل
            مع الأطراف الأخرى. يمنع نشر معلومات كاذبة أو استخدام حسابات مزيفة، وأي مخالفة قد تؤدي
            إلى تعليق الحساب أو حذفه.
          </p>
        </div>

        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">منع الاحتيال</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            يمنع منعًا باتًا أي سلوك احتيالي مثل انتحال الهوية، طلب تحويلات مشبوهة، أو بيع سلع
            غير حقيقية. يحتفظ التطبيق بحق اتخاذ الإجراءات اللازمة، بما فيها إيقاف الحساب وتقديم
            البلاغات للجهات المختصة عند الحاجة.
          </p>
        </div>

        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">سياسة الإعلانات</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            يجب أن يكون الإعلان واضحًا، دقيقًا، وغير مخالف للأنظمة. يمنع نشر محتوى مسيء، مكرر،
            أو مضلل، كما يمنع الترويج لمنتجات محظورة. يحق للإدارة تعديل أو إزالة أي إعلان يخالف
            السياسات دون إشعار مسبق.
          </p>
          <a
            href="mailto:support@souq-arab.eu"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 rounded-lg border border-primary/30 px-3 py-2 text-sm font-medium text-primary transition hover:border-primary hover:bg-primary/10 hover:underline"
          >
            فتح البريد القانوني
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

