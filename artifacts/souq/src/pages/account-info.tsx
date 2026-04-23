import { AccountHeader } from "@/components/account-header";
import { Globe, HelpCircle, Info, Lock, Shield, Star, CreditCard } from "lucide-react";
import { useRoute } from "wouter";

const PAGES: Record<string, { title: string; icon: React.ReactNode; body: React.ReactNode }> = {
  language: {
    title: "اللغة",
    icon: <Globe className="w-6 h-6" />,
    body: (
      <p>التطبيق يدعم اللغة العربية حالياً. سنُضيف لغات أخرى قريباً.</p>
    ),
  },
  privacy: {
    title: "الخصوصية",
    icon: <Shield className="w-6 h-6" />,
    body: (
      <>
        <p className="mb-3">نحن نهتم بخصوصيتك. لا نشارك بياناتك مع أي طرف ثالث.</p>
        <ul className="list-disc pr-5 space-y-2 text-muted-foreground">
          <li>رقم هاتفك يُعرض فقط للمشترين المهتمين بإعلاناتك.</li>
          <li>بريدك الإلكتروني لا يُعرض علنياً.</li>
          <li>يمكنك حذف حسابك في أي وقت بالتواصل مع الدعم.</li>
        </ul>
      </>
    ),
  },
  security: {
    title: "الأمان",
    icon: <Lock className="w-6 h-6" />,
    body: (
      <>
        <p className="mb-3">نُؤمن جلستك وكلمة مرورك بأحدث المعايير.</p>
        <ul className="list-disc pr-5 space-y-2 text-muted-foreground">
          <li>كلمات المرور مُشفّرة ولا نطّلع عليها.</li>
          <li>الجلسات محمية بملفات تعريف ارتباط مُشفّرة.</li>
          <li>تأكيد البريد الإلكتروني مطلوب لتأمين الحساب.</li>
        </ul>
      </>
    ),
  },
  payments: {
    title: "المدفوعات",
    icon: <CreditCard className="w-6 h-6" />,
    body: (
      <p>نشر الإعلانات مجاني. ميزات الدفع للإعلانات المميّزة قادمة قريباً.</p>
    ),
  },
  help: {
    title: "المساعدة والدعم",
    icon: <HelpCircle className="w-6 h-6" />,
    body: (
      <>
        <p className="mb-3">للتواصل مع فريق الدعم، راسلنا عبر:</p>
        <a
          href="mailto:support@souq-arab.de"
          className="text-primary font-medium"
          dir="ltr"
        >
          support@souq-arab.de
        </a>
      </>
    ),
  },
  rate: {
    title: "قيّم التطبيق",
    icon: <Star className="w-6 h-6" />,
    body: (
      <p>تقييمك يُساعدنا على التحسين. شكراً لاستخدامك سوق العرب ألمانيا!</p>
    ),
  },
  about: {
    title: "عن التطبيق",
    icon: <Info className="w-6 h-6" />,
    body: (
      <>
        <p className="mb-3">سوق العرب ألمانيا</p>
        <p className="text-muted-foreground mb-1">الإصدار 1.0.0</p>
        <p className="text-muted-foreground">منصة إعلانات مبوّبة للناطقين بالعربية في ألمانيا.</p>
      </>
    ),
  },
};

export default function AccountInfoPage() {
  const [, params] = useRoute("/account/:slug");
  const slug = params?.slug ?? "";
  const page = PAGES[slug];
  if (!page) {
    return (
      <div className="flex flex-col w-full min-h-[100dvh] bg-background">
        <AccountHeader title="غير موجود" />
        <div className="p-6 text-center text-muted-foreground">الصفحة غير موجودة.</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col w-full min-h-[100dvh] bg-background pb-8">
      <AccountHeader title={page.title} />
      <div className="p-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
            {page.icon}
          </div>
          <div className="text-sm leading-relaxed">{page.body}</div>
        </div>
      </div>
    </div>
  );
}
