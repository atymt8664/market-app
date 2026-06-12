import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { LegalDocumentHeader } from "@/components/legal-document-header";
import {
  SETTINGS_CARD,
  SETTINGS_HUB_SUBPAGE_MAIN,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_PAGE_BG,
} from "@/components/settings-shell";

export default function TermsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full flex-col ${SETTINGS_PAGE_BG}`}
      dir="rtl"
    >
      <LegalDocumentHeader title="الشروط والأحكام" />

      <div className={`${SETTINGS_HUB_SUBPAGE_MAIN} flex-1 ${SETTINGS_IMMERSIVE_BOTTOM}`}>
        <div className={SETTINGS_CARD}>
          <h2 className="text-base font-semibold text-foreground">مقدمة</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            تنظم هذه الشروط استخدام تطبيق{" "}
            <span className="font-medium text-foreground">Souq Arab EU</span>. باستخدامك للتطبيق،
            فأنت تقر بقراءة الشروط والأحكام وتوافق على الالتزام بها ضمن حدود القوانين المحلية
            المعمول بها.
          </p>
        </div>

        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">1) قبول الشروط</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            الدخول إلى المنصة أو إنشاء حساب أو نشر إعلان يعني الموافقة على هذه الشروط. إذا لم
            توافق على أي بند، يجب التوقف عن استخدام التطبيق.
          </p>
        </div>

        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">2) مسؤولية المستخدم</h3>
          <ul className="mt-2 list-disc space-y-1.5 pr-5 text-sm leading-7 text-muted-foreground">
            <li>المستخدم مسؤول عن حسابه وبياناته ومحتوى إعلاناته.</li>
            <li>يلتزم المستخدم بتقديم معلومات صحيحة وعدم إساءة استخدام المنصة.</li>
            <li>المستخدم مسؤول عن أي نشاط يتم من خلال حسابه.</li>
          </ul>
        </div>

        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">3) الإعلانات والمحتوى الممنوع</h3>
          <ul className="mt-2 list-disc space-y-1.5 pr-5 text-sm leading-7 text-muted-foreground">
            <li>يمنع نشر أي محتوى احتيالي أو مضلل أو مخالف للقوانين.</li>
            <li>يمنع عرض أو بيع منتجات أو خدمات محظورة أو غير قانونية.</li>
            <li>يمنع انتحال الهوية أو استخدام معلومات مزيفة.</li>
            <li>يمنع أي سلوك يضر بالمستخدمين أو بسمعة المنصة.</li>
          </ul>
        </div>

        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">4) إدارة المنصة وصلاحيات الإدارة</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            تحتفظ إدارة المنصة بحق اتخاذ الإجراءات اللازمة لحماية المنصة والمستخدمين، بما في ذلك:
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pr-5 text-sm leading-7 text-muted-foreground">
            <li>إخفاء الإعلانات المخالفة.</li>
            <li>حذف الإعلانات المخالفة.</li>
            <li>تعليق أو تقييد الحسابات المخالفة.</li>
            <li>مراجعة البلاغات واتخاذ الإجراء المناسب.</li>
          </ul>
        </div>

        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">5) الرسائل والتواصل بين المستخدمين</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            التطبيق يوفر وسيلة للتواصل بين المستخدمين داخل المنصة. هذا التواصل لا يمثل ضمانًا
            لإتمام أي عملية بيع أو شراء خارجية، ويتحمل المستخدم مسؤولية التحقق من الطرف الآخر قبل
            أي اتفاق.
          </p>
        </div>

        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">6) الإعلانات المميزة والخدمات المدفوعة</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            قد توفر المنصة لاحقًا خدمات ترويجية أو مدفوعة (مثل الإعلانات المميزة). تحتفظ المنصة
            بحق تعديل هذه الخدمات أو إيقافها أو تغيير شروطها مستقبلًا وفق متطلبات التشغيل.
          </p>
        </div>

        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">7) حدود المسؤولية</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            المنصة تعمل كوسيط تقني لعرض الإعلانات والتواصل بين المستخدمين، ولا تتحمل مسؤولية مباشرة
            عن اتفاقات البيع والشراء أو جودة السلع أو صحة ادعاءات الأطراف. المستخدم يتحمل مسؤولية
            قراراته وتعاملاته.
          </p>
        </div>

        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">8) الحسابات والأمان</h3>
          <ul className="mt-2 list-disc space-y-1.5 pr-5 text-sm leading-7 text-muted-foreground">
            <li>المستخدم مسؤول عن حماية بيانات تسجيل الدخول الخاصة به.</li>
            <li>يمنع مشاركة الحساب مع أي طرف آخر.</li>
            <li>يمنع استخدام الحساب بطريقة مسيئة أو تؤثر على أمان المنصة.</li>
          </ul>
        </div>

        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">9) إنهاء الاستخدام</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            يحق للإدارة تقييد أو تعليق أو حذف الحسابات التي تخالف هذه الشروط أو أي سياسات تشغيلية
            ذات صلة، وذلك لحماية المستخدمين والمنصة.
          </p>
        </div>

        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">10) تحديث الشروط</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            قد يتم تحديث هذه الشروط من وقت لآخر لمواكبة التطورات التشغيلية أو القانونية. استمرار
            استخدامك للتطبيق بعد نشر التحديث يعني قبولك بالنسخة الأحدث من الشروط.
          </p>
        </div>

        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">11) التواصل</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            للاستفسارات المتعلقة بالشروط والأحكام، يمكنك التواصل معنا عبر البريد الرسمي:
          </p>
          <a
            href="mailto:souqarab.market@gmail.com"
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

