import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ArrowRight,
  Loader2,
  KeyRound,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuthResetPassword } from "@workspace/api-client-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";
import {
  SETTINGS_ACTION_PANEL,
  SETTINGS_CARD,
  SETTINGS_HEADER_BAR,
  SETTINGS_HEADER_INNER,
  SETTINGS_INPUT,
  SETTINGS_INPUT_ICON_BUTTON,
  SETTINGS_INPUT_ICON_CLASS,
  SETTINGS_LABEL,
  SETTINGS_MAIN_COLUMN,
  SETTINGS_PAGE_BG,
  SETTINGS_PAGE_TITLE,
  SETTINGS_PRIMARY_BUTTON,
  SETTINGS_BACK_BUTTON,
} from "@/components/settings-shell";

const schema = z
  .object({
    password: z
      .string()
      .min(
        1,
        "auth.validation.password_policy",
      ),
    confirm: z.string().min(1, "auth.validation.confirm_password_required"),
  })
  .superRefine((values, ctx) => {
    if (
      values.password.length < 8 ||
      !/[a-z]/.test(values.password) ||
      !/[A-Z]/.test(values.password) ||
      !/[0-9]/.test(values.password)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message:
          "auth.validation.password_policy",
      });
    }
    if (values.password !== values.confirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirm"],
        message: "auth.validation.passwords_mismatch",
      });
    }
  });

type Values = z.infer<typeof schema>;

export default function ResetPassword() {
  const { locale } = useLocale();
  const [, navigate] = useLocation();
  const mut = useAuthResetPassword();
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token") || "";
    setToken(t);
    if (!t) setError("auth.reset.invalid_or_expired_link");
  }, []);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = (data: Values) => {
    if (!token) return;
    setError(null);
    mut.mutate(
      { data: { token, password: data.password } },
      {
        onSuccess: () => {
          setDone(true);
          setTimeout(() => navigate("/login"), 1500);
        },
        onError: (err: unknown) => {
          const e = err as { data?: { error?: string } };
          setError(
            e?.data?.error || t("auth.reset.invalid_or_expired_link"),
          );
        },
      },
    );
  };

  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex min-h-[100dvh] w-full flex-col ${SETTINGS_PAGE_BG}`}
      dir={dir}
    >
      <header className={SETTINGS_HEADER_BAR}>
        <div className={SETTINGS_HEADER_INNER}>
          <h1 className={SETTINGS_PAGE_TITLE}>{t("auth.reset.title")}</h1>
          <Link href="/login">
            <button
              type="button"
              className={SETTINGS_BACK_BUTTON}
              aria-label={t("common.back")}
            >
              <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
            </button>
          </Link>
        </div>
      </header>

      <div
        className={cn(
          SETTINGS_MAIN_COLUMN,
          "flex flex-1 flex-col justify-center gap-6 py-10 md:py-14",
        )}
      >
        {done ? (
          <div
            className={cn(
              SETTINGS_CARD,
              "mx-auto w-full max-w-md shadow-[0_0_40px_-14px_hsl(var(--primary)/0.28)]",
            )}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative flex items-center justify-center">
                <div className="absolute h-28 w-28 rounded-full bg-primary/15 blur-2xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/40 bg-[#0A0A0A]/90 shadow-[0_0_24px_-10px_hsl(var(--primary)/0.35)] ring-1 ring-primary/20">
                  <CheckCircle2 className="h-8 w-8 text-primary" strokeWidth={2.25} />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-foreground">
                  {t("auth.reset.success_title")}
                </h3>
                <p className="text-sm text-zinc-400">{t("auth.reset.success_desc")}</p>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              SETTINGS_CARD,
              "mx-auto w-full max-w-md shadow-[0_0_40px_-14px_hsl(var(--primary)/0.28)]",
            )}
          >
            <div className="mb-6 flex flex-col items-center gap-4 text-center">
              <div className="relative flex items-center justify-center">
                <div className="absolute h-32 w-32 rounded-full bg-primary/12 blur-3xl" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/40 bg-[#0A0A0A]/90 shadow-[0_0_28px_-12px_hsl(var(--primary)/0.32)] ring-1 ring-primary/22">
                  <KeyRound className="h-9 w-9 text-primary" strokeWidth={2.25} />
                </div>
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-foreground md:text-2xl">
                  {t("auth.reset.heading")}
                </h2>
                <p className="text-sm text-zinc-400">{t("auth.reset.subheading")}</p>
              </div>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col gap-5"
              >
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={SETTINGS_LABEL}>
                        {t("auth.reset.new_password")}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className={cn(
                              SETTINGS_INPUT,
                              dir === "rtl" ? "pl-11" : "pr-11",
                            )}
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className={cn(
                              SETTINGS_INPUT_ICON_BUTTON,
                              dir === "rtl" ? "left-3" : "right-3 left-auto",
                            )}
                            aria-label={
                              showPassword
                                ? t("auth.aria.hide_password")
                                : t("auth.aria.show_password")
                            }
                          >
                            {showPassword ? (
                              <EyeOff className={SETTINGS_INPUT_ICON_CLASS} strokeWidth={2.25} />
                            ) : (
                              <Eye className={SETTINGS_INPUT_ICON_CLASS} strokeWidth={2.25} />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage>
                        {form.formState.errors.password?.message
                          ? t(String(form.formState.errors.password.message))
                          : ""}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={SETTINGS_LABEL}>
                        {t("auth.fields.confirm_password")}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className={cn(
                              SETTINGS_INPUT,
                              dir === "rtl" ? "pl-11" : "pr-11",
                            )}
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword((prev) => !prev)
                            }
                            className={cn(
                              SETTINGS_INPUT_ICON_BUTTON,
                              dir === "rtl" ? "left-3" : "right-3 left-auto",
                            )}
                            aria-label={
                              showConfirmPassword
                                ? t("auth.aria.hide_confirm_password")
                                : t("auth.aria.show_confirm_password")
                            }
                          >
                            {showConfirmPassword ? (
                              <EyeOff className={SETTINGS_INPUT_ICON_CLASS} strokeWidth={2.25} />
                            ) : (
                              <Eye className={SETTINGS_INPUT_ICON_CLASS} strokeWidth={2.25} />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage>
                        {form.formState.errors.confirm?.message
                          ? t(String(form.formState.errors.confirm.message))
                          : ""}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                {error && (
                  <p
                    className="rounded-xl border border-destructive/35 bg-destructive/10 px-3 py-2.5 text-center text-sm text-destructive ring-1 ring-destructive/20"
                    dir={dir}
                  >
                    {error.startsWith("auth.") ? t(error) : error}
                  </p>
                )}
                <div className={`${SETTINGS_ACTION_PANEL} pt-1`}>
                  <button
                    type="submit"
                    disabled={mut.isPending || !token}
                    className={cn(SETTINGS_PRIMARY_BUTTON, "rounded-xl")}
                  >
                    {mut.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      t("auth.reset.submit")
                    )}
                  </button>
                </div>
              </form>
            </Form>
          </div>
        )}
      </div>
    </motion.div>
  );
}
