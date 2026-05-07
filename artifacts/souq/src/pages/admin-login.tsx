import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, LayoutDashboard, Loader2 } from "lucide-react";
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

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ password: password.trim() }),
      });

      if (res.ok) {
        window.location.href = "/admin";
        return;
      }

      setError("كلمة المرور غير صحيحة");
    } catch {
      setError("تعذر الاتصال بالسيرفر");
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
            <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-primary/35 bg-zinc-950/80 shadow-[0_0_24px_-12px_hsl(var(--primary)/0.35)] ring-1 ring-primary/15">
              <LayoutDashboard className="h-11 w-11 text-primary" strokeWidth={2} />
            </div>
          </div>

          <div className={cn(AUTH_HERO_CARD, "w-full max-w-md space-y-1.5")}>
            <h2 className="text-lg font-bold text-foreground md:text-xl">دخول المشرفين</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              أدخل كلمة مرور لوحة التحكم للمتابعة
            </p>
          </div>
        </div>

        <div className={AUTH_CARD}>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleLogin();
            }}
          >
            <label className="text-right text-sm font-medium text-foreground" htmlFor="admin-password">
              كلمة مرور الأدمن
            </label>
            <input
              id="admin-password"
              name="admin-password"
              type="password"
              autoComplete="off"
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
        </div>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          هذه الصفحة مخصّصة لفريق التشغيل فقط.
        </p>
      </div>
    </motion.div>
  );
}
