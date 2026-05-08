import { useLayoutEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowRight, Loader2, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { getAuthMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import { LEGAL_EXPLICIT_RETURN_KEY, LEGAL_NAV_RETURN_KEY } from "@/lib/return-navigation";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
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

const schema = z.object({
  email: z.string().email("auth.validation.invalid_email"),
  password: z
    .string()
    .min(1, "auth.validation.password_required")
    .min(6, "auth.validation.password_short"),
});

type Values = z.infer<typeof schema>;

/** إرجاع مسار داخلي فقط، وتفادي loop نحو /login وروابط نسبية تُبقي المستخدم على شاشة الدخول */
function resolvePostLoginRedirect(search: string): string {
  const params = new URLSearchParams(search);
  const raw = params.get("redirect");
  if (raw == null || raw.trim() === "") return "/";
  let path = raw.trim();
  try {
    path = decodeURIComponent(path);
  } catch {
    return "/";
  }
  if (path.startsWith("//")) return "/";
  if (!path.startsWith("/")) return "/";
  if (path === "/login" || path.startsWith("/login?")) return "/";
  if (path === "/create-ad") return "/new";
  return path;
}

function isOnLoginPath(path: string): boolean {
  return path === "/login" || path === "login" || /(^|\/)login$/.test(path);
}

export default function Login() {
  const { locale } = useLocale();
  const [locationPath, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [accountDisabledByAdmin, setAccountDisabledByAdmin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** بعد إعادة التوجيه من اعتراض الحظر، أو فتح الرابط مع ?accountDisabled=1 */
  useLayoutEffect(() => {
    try {
      const params = new URLSearchParams(search);
      if (params.get("accountDisabled") === "1") {
        setAccountDisabledByAdmin(true);
        sessionStorage.removeItem("souq_account_disabled");
        void queryClient.invalidateQueries({ queryKey: getAuthMeQueryKey() });
        queryClient.removeQueries({ queryKey: getAuthMeQueryKey() });
      } else if (sessionStorage.getItem("souq_account_disabled") === "1") {
        setAccountDisabledByAdmin(true);
        sessionStorage.removeItem("souq_account_disabled");
        queryClient.removeQueries({ queryKey: getAuthMeQueryKey() });
      }
    } catch {
      /* ignore */
    }
  }, [search, queryClient]);

  /** إذا أصبح المستخدم مسجلاً (من الكاش أو بعد setQueryData) يجب مغادرة /login فوراً */
  useLayoutEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (!isOnLoginPath(locationPath)) return;
    setLocation(resolvePostLoginRedirect(search), { replace: true });
  }, [authLoading, isAuthenticated, locationPath, search, setLocation]);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: Values) => {
    setError(null);
    setAccountDisabledByAdmin(false);
    setIsSubmitting(true);

    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = {};
      }

      if (!res.ok) {
        if (res.status === 403 && json?.code === "EMAIL_NOT_VERIFIED") {
          const params = new URLSearchParams({ email: json?.email || data.email });

          toast({
            title: t("auth.login.email_not_verified_title"),
            description: t("auth.login.email_not_verified_desc"),
          });

          setLocation(`/verify-email?${params.toString()}`);
          return;
        }

        if (res.status === 403 && json?.code === "ACCOUNT_DISABLED") {
          setAccountDisabledByAdmin(true);
          return;
        }

        throw new Error("auth.login.invalid_credentials");
      }

      toast({ title: t("auth.login.success") });
      try {
        sessionStorage.removeItem(LEGAL_EXPLICIT_RETURN_KEY);
        sessionStorage.removeItem(LEGAL_NAV_RETURN_KEY);
      } catch {
        /* ignore */
      }
      queryClient.setQueryData(getAuthMeQueryKey(), json);
      void queryClient.invalidateQueries({ queryKey: getAuthMeQueryKey() });

      const next = resolvePostLoginRedirect(window.location.search);
      setLocation(next, { replace: true });

    } catch (err: any) {
      const msg = err?.message as string | undefined;
      setError(
        msg && msg.startsWith("auth.")
          ? t(msg)
          : msg || t("auth.login.failed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={AUTH_PAGE_BG}
      dir={dir}
    >
      <header className={AUTH_HEADER}>
        <Link href="/">
          <button type="button" className={AUTH_BACK_BUTTON} aria-label={t("common.back")}>
            <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </Link>
        <h1 className={AUTH_HEADER_TITLE}>{t("auth.login.title")}</h1>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-8 pt-6 md:px-5">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="absolute h-36 w-36 rounded-full bg-primary/15 blur-3xl" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-primary/35 bg-zinc-950/80 shadow-[0_0_24px_-12px_hsl(var(--primary)/0.35)] ring-1 ring-primary/15">
              <LogIn className="h-11 w-11 text-primary" strokeWidth={2} />
            </div>
          </div>

          <div className={cn(AUTH_HERO_CARD, "w-full max-w-md space-y-1.5")}>
            <h2 className="text-lg font-bold text-foreground md:text-xl">
              {t("auth.login.welcome_title")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("auth.login.welcome_desc")}
            </p>
          </div>
        </div>

        <div className={AUTH_CARD}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">{t("auth.fields.email")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        dir="ltr"
                        className={cn(
                          AUTH_INPUT,
                          locale === "ar" ? "text-right" : "text-left",
                        )}
                        placeholder="name@email.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage>
                      {form.formState.errors.email?.message
                        ? t(String(form.formState.errors.email.message))
                        : null}
                    </FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">{t("auth.fields.password")}</FormLabel>
                    <FormControl>
                      <Input type="password" className={AUTH_INPUT} placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage>
                      {form.formState.errors.password?.message
                        ? t(String(form.formState.errors.password.message))
                        : null}
                    </FormMessage>
                  </FormItem>
                )}
              />

              {accountDisabledByAdmin && (
                <p className="rounded-xl border border-amber-500/35 bg-amber-950/25 p-3 text-center text-sm leading-relaxed text-amber-100 ring-1 ring-amber-500/20">
                  {t("auth.login.account_disabled")}{" "}
                  <a
                    href="mailto:souqarab.market@gmail.com"
                    className="font-medium text-primary underline underline-offset-2 hover:text-primary/90"
                  >
                    souqarab.market@gmail.com
                  </a>
                </p>
              )}

              {error && (
                <p className="rounded-xl border border-destructive/35 bg-destructive/10 p-3 text-center text-sm text-destructive ring-1 ring-destructive/20">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="ghost"
                className={cn(AUTH_ACCENT_OUTLINE_BTN, "mt-1 hover:bg-zinc-900")}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  t("auth.login.submit")
                )}
              </Button>

              <Link
                href="/forgot-password"
                className="text-center text-sm font-medium text-primary/90 hover:text-primary hover:underline"
              >
                {t("auth.login.forgot_password")}
              </Link>
            </form>
          </Form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {t("auth.login.no_account")}{" "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            {t("auth.login.create_account")}
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
