import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { LegalDocumentHeader } from "@/components/legal-document-header";
import {
  SETTINGS_CARD,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_MAIN_COLUMN,
  SETTINGS_PAGE_BG,
} from "@/components/settings-shell";

export default function PrivacyPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full flex-col ${SETTINGS_PAGE_BG}`}
      dir="rtl"
    >
      <LegalDocumentHeader title="سياسة الخصوصية" />

      <div className={`${SETTINGS_MAIN_COLUMN} flex-1 ${SETTINGS_IMMERSIVE_BOTTOM}`}>
        <div className={SETTINGS_CARD}>
          <h2 className="text-base font-semibold text-foreground">مقدمة</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            توضح هذه السياسة كيفية جمع واستخدام وحماية البيانات عند استخدام تطبيق{" "}
            <span className="font-medium text-foreground">Souq Arab EU</span>. باستخدامك للتطبيق،
            فإنك توافق على ما ورد في هذه السياسة بالحد الذي يسمح به القانون المحلي المعمول به.
          </p>
        </div>

        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">1) البيانات التي نجمعها</h3>
          <ul className="mt-2 list-disc space-y-1.5 pr-5 text-sm leading-7 text-muted-foreground">
            <li>بيانات الحساب: الاسم، البريد الإلكتروني، رقم الهاتف.</li>
            <li>بيانات الموقع العامة: الدولة والمدينة.</li>
            <li>بيانات الإعلانات: العنوان، الوصف، الصور، التفاصيل المرتبطة بالإعلان.</li>
            <li>بيانات التواصل داخل التطبيق: الرسائل بين المستخدمين.</li>
            <li>بيانات البلاغات وتذاكر الدعم عند التواصل مع الإدارة.</li>
            <li>بيانات استخدام أساسية وتقنية لتحسين الأداء وتجربة الاستخدام.</li>
          </ul>
        </div>

        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">2) لماذا نجمع هذه البيانات</h3>
          <ul className="mt-2 list-disc space-y-1.5 pr-5 text-sm leading-7 text-muted-foreground">
            <li>إنشاء الحساب وإدارته والتحقق من هوية المستخدم.</li>
            <li>تمكين نشر الإعلانات وعرضها والبحث عنها داخل المنصة.</li>
            <li>تسهيل التواصل بين البائعين والمشترين داخل التطبيق.</li>
            <li>تعزيز الأمان، اكتشاف السلوك الاحتيالي، ومنع إساءة الاستخدام.</li>
            <li>تحسين الخدمة وقياس الأداء وتطوير تجربة المستخدم.</li>
            <li>
              إرسال رموز التحقق ورسائل الأمان والتنبيهات النظامية المرتبطة بالحساب (مثل OTP ورسائل
              المصادقة).
            </li>
          </ul>
        </div>

        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">3) الصور والمحتوى الذي يرفعه المستخدم</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            المستخدم مسؤول عن المحتوى الذي يقوم برفعه أو نشره داخل المنصة، بما في ذلك الصور
            والنصوص. يمنع نشر أي محتوى مخالف للقانون أو مضلل أو احتيالي، ويحق للإدارة مراجعة أو
            تقييد أو حذف المحتوى المخالف وفق سياسات المنصة ومتطلبات السلامة.
          </p>
        </div>

        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">4) مشاركة البيانات مع أطراف خارجية</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            نحن لا نبيع البيانات الشخصية للمستخدمين. قد تتم معالجة بعض البيانات من خلال مزودي خدمة
            تقنيين موثوقين لتشغيل المنصة فقط، مثل:
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pr-5 text-sm leading-7 text-muted-foreground">
            <li>Supabase</li>
            <li>Railway</li>
            <li>Vercel</li>
            <li>Resend</li>
          </ul>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            يتم ذلك بالحد الأدنى اللازم لتقديم الخدمة، وليس لأغراض بيع أو استغلال تسويقي للبيانات.
          </p>
        </div>

        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">5) حماية وأمن البيانات</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            نعتمد إجراءات تقنية وتنظيمية معقولة لحماية البيانات والحسابات من الوصول غير المصرح به أو
            التعديل أو الفقدان. ومع ذلك، لا يمكن ضمان أمان الإنترنت بنسبة 100%، لذلك نوصي المستخدمين
            بالحفاظ على سرية بيانات تسجيل الدخول وعدم مشاركتها مع أي طرف آخر.
          </p>
        </div>

        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">6) الرسائل والإشعارات</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            قد نرسل إشعارات داخل التطبيق مرتبطة بالنشاط والحساب. كما قد نرسل رسائل بريدية تخص
            التحقق والأمان واستعادة الحساب من البريد المخصص للإرسال التلقائي:
          </p>
          <p className="mt-1 text-sm font-medium text-foreground" dir="ltr">
            no-reply@souq-arab.com
          </p>
        </div>

        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">7) حذف الحساب والاحتفاظ بالبيانات</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            يمكنك حذف حسابك من داخل التطبيق عبر صفحة{" "}
            <span className="font-medium text-foreground">الإعدادات</span> باتباع خيار حذف الحساب
            وتأكيد الهوية بكلمة المرور. عند إتمام الحذف يتم إزالة حسابك وبياناتك المرتبطة به على
            المنصة، بما يشمل على سبيل المثال لا الحصر: الإعلانات، الإشعارات داخل التطبيق، المفضلة
            والإعجابات، وجوانب محددة من بيانات الرسائل والمحادثات المرتبطة بحسابك كما تقتضيه
            آليات المنصة.
          </p>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            حذف الحساب <span className="font-medium text-foreground">إجراء دائم</span> ولا يمكن
            التراجع عنه بعد التنفيذ. قد نحتفظ بسجلات أمنية أو إدارية محدودة وبصيغة لا تكشف هويتك
            بشكل مباشر عند الضرورة لحماية المنصة أو منع الإساءة أو للامتثال للالتزامات القانونية
            المعمول بها.
          </p>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            لأي طلب متعلق بالخصوصية أو البيانات يمكنك التواصل معنا عبر البريد{" "}
            <a
              href="mailto:souqarab.market@gmail.com"
              className="font-medium text-primary underline-offset-2 hover:underline"
              dir="ltr"
            >
              souqarab.market@gmail.com
            </a>
            .
          </p>
        </div>

        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">8) القاصرين</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            التطبيق غير مخصص لمن هم دون السن القانوني المحلي في بلد الاستخدام. في حال تبيّن وجود
            استخدام مخالف لذلك، يحق للإدارة اتخاذ الإجراءات المناسبة لحماية المستخدمين والمنصة.
          </p>
        </div>

        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">9) تحديثات سياسة الخصوصية</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            قد نقوم بتحديث هذه السياسة من وقت لآخر بما يتوافق مع تطور الخدمة أو المتطلبات التنظيمية.
            استمرارك في استخدام التطبيق بعد نشر أي تحديث يعني اطلاعك وقبولك بالنسخة المحدثة.
          </p>
        </div>

        <div className={SETTINGS_CARD}>
          <h3 className="text-sm font-semibold text-foreground">10) التواصل</h3>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            للاستفسارات المتعلقة بالخصوصية أو البيانات، يمكنك التواصل معنا عبر البريد الرسمي:
          </p>
          <a
            href="mailto:souqarab.market@gmail.com"
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

