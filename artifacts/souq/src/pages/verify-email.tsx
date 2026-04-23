import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Loader2, MailCheck } from "lucide-react";
import { motion } from "framer-motion";
import {
  useAuthVerifyEmail,
  useAuthResendVerification,
  getAuthMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function VerifyEmail() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const verifyMutation = useAuthVerifyEmail();
  const resendMutation = useAuthResendVerification();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const initialCodeRef = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get("email") || "";
    setEmail(e);
    const c = params.get("code") || "";
    if (c) {
      setCode(c);
      initialCodeRef.current = c;
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || code.length < 4) {
      setError("أدخل رمز التفعيل المكوّن من 6 أرقام");
      return;
    }
    verifyMutation.mutate(
      { data: { email, code } },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: getAuthMeQueryKey() });
          toast({ title: "تم تفعيل بريدك الإلكتروني" });
          navigate("/");
        },
        onError: () => {
          setError("الرمز غير صحيح أو منتهي الصلاحية");
        },
      },
    );
  };

  const handleResend = () => {
    if (!email) return;
    resendMutation.mutate(
      { data: { email } },
      {
        onSuccess: (data: { devVerificationCode?: string }) => {
          if (data?.devVerificationCode) {
            toast({
              title: "رمز جديد (وضع التطوير)",
              description: data.devVerificationCode,
            });
          } else {
            toast({ title: "تم إرسال رمز جديد إلى بريدك" });
          }
        },
      },
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col w-full min-h-[100dvh] bg-background"
    >
      <header className="sticky top-0 z-40 bg-background border-b border-border p-4 flex items-center gap-4">
        <Link href="/login">
          <button className="p-2 -mr-2 rounded-full hover:bg-muted active:scale-95 transition-all">
            <ArrowRight className="w-5 h-5" />
          </button>
        </Link>
        <h1 className="font-bold text-lg">تفعيل البريد الإلكتروني</h1>
      </header>

      <div className="p-6 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 pt-4 pb-2">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
            <MailCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold">أدخل رمز التفعيل</h2>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            أرسلنا رمزاً مكوناً من 6 أرقام إلى{" "}
            <span dir="ltr" className="font-semibold text-foreground">
              {email || "بريدك الإلكتروني"}
            </span>
            . أدخله أدناه لتفعيل حسابك.
          </p>
          {initialCodeRef.current && (
            <div className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-md px-3 py-2 text-center">
              وضع التطوير: تم تعبئة الرمز تلقائياً من إنشاء الحساب.
              <br />
              في الإنتاج سيصلك الرمز عبر البريد.
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            inputMode="numeric"
            maxLength={6}
            placeholder="——————"
            dir="ltr"
            className="text-center text-3xl tracking-[0.5em] font-bold py-6 font-mono"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-center">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="py-6 text-base font-bold"
            disabled={verifyMutation.isPending || code.length < 4}
          >
            {verifyMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "تفعيل الحساب"
            )}
          </Button>
        </form>

        <div className="text-center text-sm">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendMutation.isPending || !email}
            className="text-primary font-bold hover:underline disabled:opacity-50"
          >
            {resendMutation.isPending ? "جارٍ الإرسال..." : "إعادة إرسال الرمز"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
