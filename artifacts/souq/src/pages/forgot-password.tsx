import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowRight, Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
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
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";

const schema = z.object({
  email: z.string().email("auth.validation.invalid_email"),
});

type Values = z.infer<typeof schema>;

export default function ForgotPassword() {
  const { locale } = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const dir = locale === "ar" ? "rtl" : "ltr";

  const onSubmit = async (data: Values) => {
    setApiError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/auth/forgot-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: data.email.trim(),
        }),
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setApiError(json.error || t("auth.forgot.failed"));
        return;
      }
      setSubmitted(true);
    } catch {
      setApiError(t("auth.forgot.failed_network"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={AUTH_PAGE_BG}
      dir={dir}
    >
      <header className={AUTH_HEADER}>
        <Link href="/login">
          <button type="button" className={AUTH_BACK_BUTTON} aria-label={t("common.back")}>
            <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </Link>
        <h1 className={AUTH_HEADER_TITLE}>{t("auth.forgot.title")}</h1>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-8 pt-6 sm:px-5">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="absolute h-36 w-36 rounded-full bg-primary/15 blur-3xl" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-primary/35 bg-zinc-950/80 shadow-[0_0_24px_-12px_hsl(var(--primary)/0.35)] ring-1 ring-primary/15">
              <KeyRound className="h-10 w-10 text-primary" strokeWidth={2} />
            </div>
          </div>
          <div className={cn(AUTH_HERO_CARD, "w-full max-w-md space-y-1.5 text-center")}>
            <h2 className="text-lg font-bold md:text-xl">{t("auth.forgot.heading")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("auth.forgot.subheading")}
            </p>
          </div>
        </div>

        {submitted ? (
          <div className={AUTH_CARD}>
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-primary" strokeWidth={2} />
              <h3 className="font-bold text-foreground">{t("auth.forgot.sent_title")}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("auth.forgot.sent_desc")}
              </p>
              <Link href="/login" className="w-full">
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(
                    AUTH_ACCENT_OUTLINE_BTN,
                    "inline-flex items-center justify-center font-semibold hover:bg-zinc-900",
                  )}
                >
                  {t("auth.forgot.back_to_login")}
                </Button>
              </Link>
              <Link
                href="/forgot-password"
                className="text-sm text-muted-foreground hover:text-primary hover:underline"
              >
                {t("auth.forgot.send_new_link")}
              </Link>
            </div>
          </div>
        ) : (
          <div className={AUTH_CARD}>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col gap-4"
                dir={dir}
              >
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
                {apiError && (
                  <p className="rounded-xl border border-destructive/35 bg-destructive/10 p-3 text-center text-sm text-destructive ring-1 ring-destructive/20">
                    {apiError.startsWith("auth.") ? t(apiError) : apiError}
                  </p>
                )}
                <Button
                  type="submit"
                  variant="ghost"
                  className={cn(AUTH_ACCENT_OUTLINE_BTN, "hover:bg-zinc-900")}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    t("auth.forgot.submit")
                  )}
                </Button>
                <Link
                  href="/login"
                  className="text-center text-sm text-muted-foreground hover:text-primary hover:underline"
                >
                  {t("auth.forgot.remembered_password")}
                </Link>
              </form>
            </Form>
          </div>
        )}
      </div>
    </motion.div>
  );
}
