import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, LayoutDashboard, Loader2, Shield } from "lucide-react";
import { absorbAdminLoginCsrf, submitAdminLoginTotp } from "@/features/admin/api";
import { apiUrl } from "@/lib/api-url";
import { cn } from "@/lib/utils";
import {
  AUTH_ACCENT_OUTLINE_BTN,
  AUTH_BACK_BUTTON,
  AUTH_CARD,
  AUTH_HEADER,
  AUTH_HEADER_TITLE,
  AUTH_HERO_CARD,
  AUTH_INPUT,
  AUTH_PAGE_BG,
} from "@/lib/auth-page-styles";

const GENERIC_CREDENTIALS = "بيانات الدخول غير صحيحة";

export default function AdminLogin() {
  const [accessKey, setAccessKey] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [step, setStep] = useState<"password" | "totp">("password");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const buildHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const trimmedAccessKey = accessKey.trim();
    if (trimmedAccessKey) {
      headers["X-Admin-Access-Key"] = trimmedAccessKey;
    }
    return headers;
  };

  const handleLogin = async () => {
    if (!password.trim()) {
      setError("اكتب كلمة مرور الأدمن");
      return;
    }

    try {
      setError("");
      setLoading(true);

      const res = await fetch(apiUrl("/api/admin-login"), {
        method: "POST",
        headers: buildHeaders(),
        credentials: "include",
        body: JSON.stringify({ password: password.trim() }),
      });

      const text = await res.text();
      let data: { requiresTwoFactor?: boolean; success?: boolean; csrfToken?: unknown } = {};
      try {
        data = text ? (JSON.parse(text) as typeof data) : {};
      } catch {
        data = {};
      }

      if (res.ok) {
        if (data.requiresTwoFactor === true) {
          setPassword("");
          setTotpCode("");
          setStep("totp");
          return;
        }
        absorbAdminLoginCsrf(data);
        window.location.href = "/admin";
        return;
      }

      if (res.status === 403) {
        setError("تم رفض الوصول.");
        return;
      }
      if (res.status === 429) {
        setError("محاولات كثيرة، انتظر قليلاً وحاول مجدداً");
        return;
      }

      setError(GENERIC_CREDENTIALS);
    } catch {
      setError("تعذر الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  const handleTotpSubmit = async () => {
    const code = totpCode.trim();
    if (!code) {
      setError("أدخل رمز التطبيق أو رمز الاسترداد");
      return;
    }
    try {
      setError("");
      setLoading(true);
      await submitAdminLoginTotp(accessKey, code);
      setTotpCode("");
      window.location.href = "/admin";
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("محاولات كثيرة") || msg.includes("رفض الوصول")) {
        setError(msg);
      } else {
        setError(GENERIC_CREDENTIALS);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={AUTH_PAGE_BG}
      dir="rtl"
    >
      <header className={AUTH_HEADER}>
        <Link href="/">
          <button type="button" className={AUTH_BACK_BUTTON} aria-label="رجوع للرئيسية">
            <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </Link>
        <h1 className={AUTH_HEADER_TITLE}>لوحة الإدارة</h1>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-8 pt-6 md:px-5">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="absolute h-36 w-36 rounded-full bg-primary/15 blur-3xl" />
            <div
              className={cn(
                "relative flex h-24 w-24 items-center justify-center rounded-2xl border bg-zinc-950/80 shadow-[0_0_24px_-12px_hsl(var(--primary)/0.35)] ring-1",
                step === "totp"
                  ? "border-lime-400/40 shadow-[0_0_28px_-10px_rgba(163,230,53,0.45)] ring-lime-400/20"
                  : "border-primary/35 ring-primary/15",
              )}
            >
              {step === "totp" ? (
                <Shield className="h-11 w-11 text-lime-400" strokeWidth={2} aria-hidden />
              ) : (
                <LayoutDashboard className="h-11 w-11 text-primary" strokeWidth={2} aria-hidden />
              )}
            </div>
          </div>

          <div className={cn(AUTH_HERO_CARD, "w-full max-w-md space-y-1.5")}>
            <h2 className="text-lg font-bold text-foreground md:text-xl">
              {step === "totp" ? "التحقق الثنائي" : "دخول المشرفين"}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {step === "totp"
                ? "أدخل الرمز من تطبيق المصادقة أو أحد أكواد الاسترداد."
                : "أدخل مفتاح الوصول وكلمة مرور لوحة التحكم عند الحاجة"}
            </p>
          </div>
        </div>

        <div
          className={cn(
            AUTH_CARD,
            step === "totp" &&
              "border-lime-500/20 shadow-[0_0_32px_-18px_rgba(163,230,53,0.35)] ring-1 ring-lime-500/15",
          )}
        >
          {step === "password" ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                void handleLogin();
              }}
            >
              <label className="text-right text-sm font-medium text-foreground" htmlFor="admin-access-key">
                مفتاح وصول الأدمن
              </label>
              <input
                id="admin-access-key"
                name="admin-access-key"
                type="password"
                autoComplete="off"
                placeholder="••••••••"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                className={cn(AUTH_INPUT, "w-full rounded-xl px-3.5 py-2.5 text-right")}
              />

              <label className="text-right text-sm font-medium text-foreground" htmlFor="admin-password">
                كلمة مرور الأدمن
              </label>
              <input
                id="admin-password"
                name="admin-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(AUTH_INPUT, "w-full rounded-xl px-3.5 py-2.5 text-right")}
              />

              {error ? (
                <p className="rounded-xl border border-destructive/35 bg-destructive/10 p-3 text-center text-sm text-destructive ring-1 ring-destructive/20">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  AUTH_ACCENT_OUTLINE_BTN,
                  "inline-flex items-center justify-center gap-2 hover:bg-zinc-900 disabled:pointer-events-none disabled:opacity-60",
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
                    جاري الدخول...
                  </>
                ) : (
                  "دخول"
                )}
              </button>
            </form>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                void handleTotpSubmit();
              }}
            >
              <label className="text-right text-sm font-medium text-foreground" htmlFor="admin-totp-code">
                رمز التطبيق أو رمز الاسترداد
              </label>
              <input
                id="admin-totp-code"
                name="admin-totp-code"
                type="text"
                inputMode="text"
                autoComplete="one-time-code"
                placeholder="رمز من 6 أرقام أو رمز استرداد"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.trim())}
                className={cn(
                  AUTH_INPUT,
                  "w-full rounded-xl px-3.5 py-2.5 text-center font-mono text-base tracking-wide dir-ltr",
                )}
                dir="ltr"
                autoFocus
              />

              {error ? (
                <p className="rounded-xl border border-destructive/35 bg-destructive/10 p-3 text-center text-sm text-destructive ring-1 ring-destructive/20">
                  {error}
                </p>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-start">
                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    AUTH_ACCENT_OUTLINE_BTN,
                    "inline-flex flex-1 items-center justify-center gap-2 border-lime-500/40 hover:bg-lime-500/10 disabled:pointer-events-none disabled:opacity-60",
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
                      جاري التحقق...
                    </>
                  ) : (
                    "تأكيد الدخول"
                  )}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setStep("password");
                    setTotpCode("");
                    setError("");
                  }}
                  className={cn(
                    AUTH_ACCENT_OUTLINE_BTN,
                    "inline-flex flex-1 items-center justify-center gap-2 opacity-90 hover:bg-zinc-900 disabled:pointer-events-none disabled:opacity-40",
                  )}
                >
                  رجوع
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          هذه الصفحة مخصّصة لفريق التشغيل فقط.
        </p>
      </div>
    </motion.div>
  );
}
