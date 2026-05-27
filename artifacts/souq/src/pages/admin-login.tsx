import { useState, lazy, Suspense } from "react";
import { Link } from "wouter";
import { ArrowRight, LayoutDashboard, Loader2, Shield } from "lucide-react";
import { absorbAdminLoginCsrf, submitAdminLoginTotp } from "@/features/admin/api";
import { apiUrl } from "@/lib/api-url";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
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

const AdminLoginMotionRoot = lazy(() => import("@/features/admin/components/admin-login-motion-root"));

export default function AdminLogin() {
  const [accessKey, setAccessKey] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
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
      setError(t("p8.admin.login.error_password_required"));
      return;
    }

    try {
      setError("");
      setLoading(true);

      const body: { password: string; email?: string } = { password: password.trim() };
      const trimmedEmail = staffEmail.trim().toLowerCase();
      if (trimmedEmail) body.email = trimmedEmail;

      const res = await fetch(apiUrl("/api/admin-login"), {
        method: "POST",
        headers: buildHeaders(),
        credentials: "include",
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let data: {
        requiresTwoFactor?: boolean;
        success?: boolean;
        csrfToken?: unknown;
        requiresPasswordChange?: boolean;
        homePath?: string;
      } = {};
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
        window.location.href = data.requiresPasswordChange
          ? "/admin/force-password-change"
          : data.homePath || "/admin";
        return;
      }

      if (res.status === 403) {
        setError(t("p8.admin.login.error_access_denied"));
        return;
      }
      if (res.status === 429) {
        setError(t("p8.admin.login.error_rate_limit"));
        return;
      }

      setError(t("p8.admin.login.error_credentials"));
    } catch {
      setError(t("p8.admin.login.error_connection"));
    } finally {
      setLoading(false);
    }
  };

  const handleTotpSubmit = async () => {
    const code = totpCode.trim();
    if (!code) {
      setError(t("p8.admin.login.error_totp_required"));
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
      if (
        msg.includes(t("p8.admin.login.error_rate_limit")) ||
        msg.includes(t("p8.admin.login.error_access_denied"))
      ) {
        setError(msg);
      } else {
        setError(t("p8.admin.login.error_credentials"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Suspense
      fallback={
        <div className={AUTH_PAGE_BG} dir="rtl">
          <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          </div>
        </div>
      }
    >
      <AdminLoginMotionRoot className={AUTH_PAGE_BG}>
      <header className={AUTH_HEADER}>
        <Link href="/">
          <button type="button" className={AUTH_BACK_BUTTON} aria-label={t("p8.admin.login.back")}>
            <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </Link>
        <h1 className={AUTH_HEADER_TITLE}>{t("p8.admin.login.title")}</h1>
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
              {step === "totp" ? t("p8.admin.login.totp_step_title") : t("p8.admin.login.password_step_title")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {step === "totp"
                ? t("p8.admin.login.totp_step_subtitle")
                : t("p8.admin.login.password_step_subtitle")}
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
                {t("p8.admin.login.access_key_label")}
              </label>
              <input
                id="admin-access-key"
                name="admin-access-key"
                type="password"
                autoComplete="off"
                placeholder={t("p8.admin.login.access_key_placeholder")}
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                className={cn(AUTH_INPUT, "w-full rounded-xl px-3.5 py-2.5 text-right")}
              />

              <label className="text-right text-sm font-medium text-foreground" htmlFor="staff-email">
                {t("p8.admin.login.staff_email_label")}
              </label>
              <input
                id="staff-email"
                name="staff-email"
                type="email"
                autoComplete="username"
                placeholder={t("p8.admin.login.staff_email_placeholder")}
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                className={cn(AUTH_INPUT, "w-full rounded-xl px-3.5 py-2.5 text-right")}
              />

              <label className="text-right text-sm font-medium text-foreground" htmlFor="admin-password">
                {t("p8.admin.login.password_label")}
              </label>
              <input
                id="admin-password"
                name="admin-password"
                type="password"
                autoComplete="current-password"
                placeholder={t("p8.admin.login.password_placeholder")}
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
                    {t("p8.admin.common.loading")}
                  </>
                ) : (
                  t("p8.admin.login.submit")
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
                {t("p8.admin.login.totp_label")}
              </label>
              <input
                id="admin-totp-code"
                name="admin-totp-code"
                type="text"
                inputMode="text"
                autoComplete="one-time-code"
                placeholder={t("p8.admin.login.totp_placeholder")}
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
                      {t("p8.admin.common.loading")}
                    </>
                  ) : (
                    t("p8.admin.login.totp_submit")
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
                  {t("p8.admin.login.back")}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          {t("p8.admin.login.footer_note")}
        </p>
      </div>
      </AdminLoginMotionRoot>
    </Suspense>
  );
}
