import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { SETTINGS_IMMERSIVE_BOTTOM } from "@/components/settings-shell";

export default function VerifyEmail() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const readJson = async (res: Response) => {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return {};
    }
  };

  const resolveVerificationEmail = () => {
    try {
      const fromQuery = new URLSearchParams(search).get("email")?.trim();
      if (fromQuery) {
        localStorage.setItem("email", fromQuery);
        return fromQuery;
      }
    } catch {
      // ignore malformed query params and fall back to local storage
    }
    return localStorage.getItem("email")?.trim() ?? "";
  };

  const handleVerify = async () => {
    if (code.trim().length !== 6) {
      toast({
        title: "خطأ",
        description: "أدخل رمز مكون من 6 أرقام",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const email = resolveVerificationEmail();
      if (!email) throw new Error("ما في إيميل محفوظ، ارجع سجل من جديد");

      const res = await fetch(apiUrl("/api/auth/verify-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
        }),
      });

      const data = await readJson(res);

      if (!res.ok) {
        throw new Error(data.error || "فشل التفعيل");
      }

      toast({
        title: "تم التفعيل",
        description: "تم تفعيل الحساب بنجاح، يمكنك تسجيل الدخول الآن",
      });
      navigate("/login");
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err.message || "فشل التفعيل",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    try {
      setResending(true);

      const email = resolveVerificationEmail();
      if (!email) throw new Error("ما في إيميل محفوظ");

      const res = await fetch(apiUrl("/api/auth/resend-verification"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await readJson(res);

      if (!res.ok) {
        throw new Error(data.error || "فشل إعادة الإرسال");
      }

      toast({
        title: "تم الإرسال",
        description: "تم إرسال رمز جديد",
      });
    } catch (err: any) {
      toast({
        title: "خطأ",
        description: err.message || "فشل إعادة الإرسال",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      className={`min-h-[100dvh] flex flex-col items-center justify-center bg-background px-6 ${SETTINGS_IMMERSIVE_BOTTOM}`}
    >
      <h1 className="text-xl font-bold mb-2">أدخل رمز التفعيل</h1>

      <p className="text-sm text-muted-foreground mb-6 text-center">
        أدخل الرمز المكون من 6 أرقام الذي وصلك على البريد
      </p>

      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        className="w-full max-w-xs text-center text-2xl tracking-widest bg-transparent border border-border rounded-xl py-3 mb-6"
        placeholder="000000"
      />

      <Button
        onClick={handleVerify}
        disabled={loading}
        className="w-full max-w-xs h-12 rounded-2xl bg-primary text-black font-bold text-base"
      >
        {loading ? "جاري التفعيل..." : "تفعيل الحساب"}
      </Button>

      <button
        onClick={resendCode}
        disabled={resending}
        className="mt-4 text-primary text-sm disabled:opacity-60"
      >
        {resending ? "جاري الإرسال..." : "إعادة إرسال الرمز"}
      </button>
    </div>
  );
}
