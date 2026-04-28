import { Redirect, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { AccountHeader } from "@/components/account-header";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Mail, ShieldAlert } from "lucide-react";
import { useAuthResendVerification } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function AccountEmail() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const resend = useAuthResendVerification();

  if (!isLoading && !user) return <Redirect to="/guest-welcome?redirect=/account/email" />;
  if (!user) return null;

  const verified = user.emailVerified;

  const handleResend = () => {
    resend.mutate(
      { data: { email: user.email } },
      {
        onSuccess: () => {
          toast({ title: "تم الإرسال", description: "تحقق من بريدك" });
          navigate(`/verify-email?email=${encodeURIComponent(user.email)}`);
        },
      },
    );
  };

  return (
    <div className="flex flex-col w-full min-h-[100dvh] bg-background pb-8">
      <AccountHeader title="البريد الإلكتروني" />
      <div className="mx-auto w-full max-w-[900px] md:max-w-[760px] lg:max-w-[860px] px-4 md:px-6 py-5">
        <div className="rounded-2xl border border-border bg-card/70 p-4 md:p-5 flex flex-col gap-4">
          <div className="bg-card rounded-xl border border-border p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground mb-1">البريد الحالي</div>
              <div className="font-medium truncate" dir="ltr">{user.email}</div>
            </div>
          </div>

          <div className={`rounded-xl border p-4 flex items-start gap-3 ${verified ? "bg-primary/5 border-primary/30" : "bg-amber-500/5 border-amber-500/30"}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${verified ? "bg-primary/15 text-primary" : "bg-amber-500/15 text-amber-500"}`}>
              {verified ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold mb-1">
                {verified ? "البريد مُفعّل" : "البريد غير مُفعّل"}
              </div>
              <div className="text-sm text-muted-foreground">
                {verified
                  ? "بريدك الإلكتروني مُفعّل ويمكنك استخدام كل ميزات التطبيق."
                  : "أرسل رمز تفعيل جديد لإكمال تفعيل حسابك."}
              </div>
              {!verified && (
                <Button
                  onClick={handleResend}
                  disabled={resend.isPending}
                  className="mt-3 w-full sm:w-auto sm:min-w-[200px]"
                >
                  {resend.isPending ? "جاري الإرسال..." : "إرسال رمز التفعيل"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
