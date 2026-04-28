import { Link, useSearch } from "wouter";
import { UserPlus, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function GuestWelcome() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const nextRaw = params.get("next") || params.get("redirect") || "/profile";
  const loginRedirectTarget = nextRaw === "/create-ad" ? "/new" : nextRaw;
  const loginHref = `/login?redirect=${encodeURIComponent(loginRedirectTarget)}`;
  const signupHref = `/signup?next=${encodeURIComponent(nextRaw)}`;
  const contextualDescription: Record<string, string> = {
    "/create-ad": "يجب أن يكون لديك حساب لنشر إعلان",
    "/messages": "يجب أن يكون لديك حساب لعرض الرسائل والتواصل مع المستخدمين",
    "/favorites": "يجب أن يكون لديك حساب لحفظ الإعلانات في المفضلة",
    "/profile": "يجب أن يكون لديك حساب لعرض وإدارة حسابك",
  };
  const contextualTitle = "يرجى تسجيل الدخول أولاً";
  const contextualText =
    contextualDescription[nextRaw] ?? "يجب أن يكون لديك حساب للمتابعة";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[100dvh] w-full flex-col bg-gradient-to-b from-background to-muted/30"
    >
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-5 pb-24 pt-10 sm:px-6">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
            <div className="absolute h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-primary/25 bg-primary/10 shadow-xl">
              <UserPlus className="h-10 w-10 text-primary" />
            </div>
          </div>
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold">أهلاً بك في سوق العرب EU</h1>
            <p className="text-sm text-muted-foreground">
              أنشئ حسابك مجانًا لبيع وشراء المنتجات بسهولة والتواصل مع المستخدمين في أوروبا وأمريكا وكندا
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background/80 p-5 shadow-xl backdrop-blur">
          <div className="flex flex-col gap-3" dir="rtl">
            <div className="rounded-xl border border-border/70 bg-muted/30 p-3 text-right">
              <p className="text-sm font-bold">{contextualTitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">{contextualText}</p>
            </div>
            <Link href={loginHref} className="w-full">
              <Button className="h-12 w-full text-base font-bold rounded-xl shadow-lg transition-all hover:scale-[1.01] gap-2">
                <LogIn className="h-4 w-4" />
                تسجيل الدخول
              </Button>
            </Link>
            <Link href={signupHref} className="w-full">
              <Button
                variant="outline"
                className="h-12 w-full text-base font-bold rounded-xl gap-2"
              >
                <UserPlus className="h-4 w-4" />
                إنشاء حساب
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
