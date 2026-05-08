import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { SETTINGS_IMMERSIVE_BOTTOM } from "@/components/settings-shell";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";

function translateMaybeKey(message: string) {
  return message.startsWith("auth.") ? t(message) : message;
}

export default function VerifyEmail() {
  const { locale } = useLocale();
  const [, navigate] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const dir = locale === "ar" ? "rtl" : "ltr";

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
        title: t("auth.verify.error_title"),
        description: t("auth.verify.code_6_digits"),
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const email = resolveVerificationEmail();
      if (!email) throw new Error("auth.verify.no_saved_email");

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
        throw new Error(data.error || "auth.verify.activation_failed");
      }

      toast({
        title: t("auth.verify.activated_title"),
        description: t("auth.verify.activated_desc"),
      });
      navigate("/login");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("auth.verify.activation_failed");
      toast({
        title: t("auth.verify.error_title"),
        description: translateMaybeKey(msg),
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
      if (!email) throw new Error("auth.verify.no_saved_email");

      const res = await fetch(apiUrl("/api/auth/resend-verification"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await readJson(res);

      if (!res.ok) {
        throw new Error(data.error || "auth.verify.resend_failed");
      }

      toast({
        title: t("auth.verify.sent_title"),
        description: t("auth.verify.sent_desc"),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("auth.verify.resend_failed");
      toast({
        title: t("auth.verify.error_title"),
        description: translateMaybeKey(msg),
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      className={`min-h-[100dvh] flex flex-col items-center justify-center bg-background px-6 ${SETTINGS_IMMERSIVE_BOTTOM}`}
      dir={dir}
    >
      <h1 className="text-xl font-bold mb-2">{t("auth.verify.title")}</h1>

      <p className="text-sm text-muted-foreground mb-6 text-center">
        {t("auth.verify.subtitle")}
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
        {loading ? t("auth.verify.activating") : t("auth.verify.submit")}
      </Button>

      <button
        type="button"
        onClick={resendCode}
        disabled={resending}
        className="mt-4 text-primary text-sm disabled:opacity-60"
      >
        {resending ? t("auth.verify.resending") : t("auth.verify.resend")}
      </button>
    </div>
  );
}
