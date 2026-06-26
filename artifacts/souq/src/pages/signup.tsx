import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowRight, ChevronDown, Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-url";
import {
  appendReturnToQuery,
  stashLegalExplicitReturn,
  stashLegalNavigationReturn,
  stashReturnTarget,
} from "@/lib/return-navigation";
import { cn } from "@/lib/utils";
import {
  AUTH_ACCENT_OUTLINE_BTN,
  AUTH_BACK_BUTTON,
  AUTH_CARD,
  AUTH_CITY_CARD_ROW,
  AUTH_HEADER,
  AUTH_HEADER_ACTION_ICON,
  AUTH_HEADER_INNER,
  AUTH_HEADER_TITLE_BADGE,
  AUTH_HEADER_TITLE_WRAP,
  AUTH_HEADER_TRAILING,
  AUTH_HERO_CARD,
  AUTH_INPUT,
  AUTH_PAGE_BG,
  AUTH_POPOVER_PANEL,
  AUTH_SELECT_ROW,
} from "@/lib/auth-page-styles";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import {
  SIGNUP_COUNTRIES,
  SIGNUP_COUNTRY_BY_CODE,
  allowsManualCityForCountry,
  countryCodeToFlagEmoji,
  getPhoneCodeFromCountry,
  loadBundledCitiesWithRetry,
} from "@/lib/signup-location-data";

const schema = z
  .object({
    firstName: z.string().min(1, "auth.validation.first_name_required"),
    lastName: z.string().min(1, "auth.validation.last_name_required"),
    countryCode: z.string().min(1, "auth.validation.country_required"),
    city: z.string().min(1, "auth.validation.city_required"),
    email: z.string().email("auth.validation.invalid_email"),
    phoneNumber: z.string().regex(/^[0-9]{6,15}$/, "auth.validation.invalid_phone"),
    password: z.string().min(1, "auth.validation.password_policy"),
    confirmPassword: z.string().min(1, "auth.validation.confirm_password_required"),
    acceptTerms: z.boolean().refine((v) => v, "auth.validation.accept_terms_required"),
    acceptPrivacy: z.boolean().refine((v) => v, "auth.validation.accept_privacy_required"),
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
        message: "auth.validation.password_policy",
      });
    }
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "auth.validation.passwords_mismatch",
      });
    }
  });

type Values = z.infer<typeof schema>;

export default function Signup() {
  const { locale } = useLocale();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);
  const [cityQuery, setCityQuery] = useState("");
  const [citySelectedFromSuggestions, setCitySelectedFromSuggestions] = useState(false);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      countryCode: "",
      city: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
      acceptPrivacy: false,
    },
  });

  const [countryCities, setCountryCities] = useState<string[]>([]);
  const [cityListLoadState, setCityListLoadState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [cityListAllowsManual, setCityListAllowsManual] = useState(false);
  const [cityListRetryNonce, setCityListRetryNonce] = useState(0);

  const countryCode = form.watch("countryCode");
  const selectedCountry = SIGNUP_COUNTRY_BY_CODE[countryCode];
  const phoneCode = selectedCountry?.phoneCode ?? getPhoneCodeFromCountry(countryCode);
  const citySuggestions =
    cityQuery.trim().length < 2 || !selectedCountry
      ? []
      : countryCities.filter((city) =>
          city.toLowerCase().includes(cityQuery.trim().toLowerCase()),
        );

  useEffect(() => {
    if (!selectedCountry?.code) {
      setCountryCities([]);
      setCityListLoadState("idle");
      setCityListAllowsManual(false);
      return;
    }
    let cancelled = false;
    setCityListLoadState("loading");
    void loadBundledCitiesWithRetry(selectedCountry.code).then((r) => {
      if (cancelled) return;
      setCountryCities(r.cities);
      setCityListAllowsManual(r.allowsManualCityEntry);
      setCityListLoadState(r.loadFailed ? "error" : "ready");
    });
    return () => {
      cancelled = true;
    };
  }, [selectedCountry?.code, cityListRetryNonce]);

  useEffect(() => {
    if (rateLimitSeconds <= 0) return;
    const timer = window.setTimeout(() => {
      setRateLimitSeconds((v) => Math.max(0, v - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [rateLimitSeconds]);

  const fieldErrorMsg = (msg: string | undefined) => {
    if (!msg) return null;
    return msg.startsWith("auth.") ? t(msg) : msg;
  };

  const onSubmit = async (data: Values) => {
    setError(null);
    if (rateLimitSeconds > 0) {
      setError(t("auth.signup.rate_limited_wait", { seconds: rateLimitSeconds }));
      return;
    }
    if (!citySelectedFromSuggestions || !data.city) {
      form.setError("city", { type: "manual", message: "auth.validation.city_required" });
      return;
    }
    const trimmedCity = data.city.trim();
    const bundle = await loadBundledCitiesWithRetry(data.countryCode);
    const manual = allowsManualCityForCountry(data.countryCode);
    if (manual && (bundle.loadFailed || bundle.cities.length === 0)) {
      if (trimmedCity.length < 2) {
        form.setError("city", { type: "manual", message: "auth.validation.city_required" });
        return;
      }
    } else {
      if (!bundle.cities.includes(data.city)) {
        form.setError("city", { type: "manual", message: "auth.validation.city_required" });
        return;
      }
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(apiUrl("/api/auth/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email: data.email.trim().toLowerCase(),
          country: selectedCountry?.name ?? "",
          countryCode: data.countryCode,
          phoneCountryCode: phoneCode,
          phoneNumber: data.phoneNumber.trim(),
          city: data.city,
          password: data.password,
          confirmPassword: data.confirmPassword,
          acceptTerms: data.acceptTerms,
          acceptPrivacy: data.acceptPrivacy,
        }),
      });

      const text = await res.text();
      const resp = text ? JSON.parse(text) : {};
      if (!res.ok) {
        let hasFieldErrors = false;
        if (resp?.fieldErrors && typeof resp.fieldErrors === "object") {
          const fieldErrors = resp.fieldErrors as Record<string, string[] | undefined>;
          const map: Record<string, keyof Values> = {
            firstName: "firstName",
            lastName: "lastName",
            countryCode: "countryCode",
            city: "city",
            email: "email",
            phoneNumber: "phoneNumber",
            password: "password",
            confirmPassword: "confirmPassword",
            acceptTerms: "acceptTerms",
            acceptPrivacy: "acceptPrivacy",
          };
          for (const [k, messages] of Object.entries(fieldErrors)) {
            if (map[k] && messages?.[0]) {
              form.setError(map[k], { type: "server", message: messages[0] });
              hasFieldErrors = true;
            }
          }
        }
        if (res.status === 409) {
          setError(t("auth.signup.email_exists"));
          return;
        }
        if (res.status === 429) {
          const retryAfter = Number.parseInt(String(res.headers.get("retry-after") || ""), 10);
          const cooldown = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 30;
          setRateLimitSeconds(cooldown);
          setError(t("auth.signup.rate_limited"));
          return;
        }
        if (hasFieldErrors) {
          return;
        }
        throw new Error(resp?.error || "auth.signup.failed");
      }

      localStorage.setItem("email", resp.email || data.email);
      toast({
        title: t("auth.signup.success_title"),
        description: resp?.devVerificationCode
          ? t("auth.signup.dev_code", { code: resp.devVerificationCode })
          : t("auth.signup.success_desc"),
      });
      const params = new URLSearchParams();
      params.set("email", resp.email || data.email);
      if (resp?.devVerificationCode) params.set("code", resp.devVerificationCode);
      navigate(`/verify-email?${params.toString()}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "auth.signup.failed";
      setError(message.startsWith("auth.") ? t(message) : t("auth.signup.failed"));
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
        <div className={AUTH_HEADER_INNER} dir={dir}>
          <h1 className={AUTH_HEADER_TITLE_WRAP}>
            <span className={AUTH_HEADER_TITLE_BADGE}>{t("auth.signup.title")}</span>
          </h1>
          <div className={AUTH_HEADER_TRAILING}>
            <Link href="/">
              <button type="button" className={AUTH_BACK_BUTTON} aria-label={t("common.back")}>
                <ArrowRight className={AUTH_HEADER_ACTION_ICON} strokeWidth={2.25} />
              </button>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-8 pt-6 md:px-5">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="absolute h-36 w-36 rounded-full bg-primary/15 blur-3xl" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-primary/35 bg-[#0A0A0A]/80 shadow-[0_0_24px_-12px_hsl(var(--primary)/0.35)] ring-1 ring-primary/15">
              <UserPlus className="h-11 w-11 text-primary" strokeWidth={2} />
            </div>
          </div>
          <div className={cn(AUTH_HERO_CARD, "w-full max-w-md space-y-1.5")}>
            <h2 className="text-lg font-bold text-foreground md:text-xl">
              {t("auth.shared.welcome_brand")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("auth.shared.welcome_desc")}
            </p>
          </div>
        </div>

        <div className={cn(AUTH_CARD, "overflow-visible")}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">{t("auth.fields.first_name")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("auth.signup.first_name_placeholder")}
                        className={AUTH_INPUT}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage>{fieldErrorMsg(form.formState.errors.firstName?.message)}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">{t("auth.fields.last_name")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("auth.signup.last_name_placeholder")}
                        className={AUTH_INPUT}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage>{fieldErrorMsg(form.formState.errors.lastName?.message)}</FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="countryCode"
                render={({ field }) => (
                  <FormItem className={cn("relative", countryPickerOpen && "z-[50] isolate")}>
                    <FormLabel className="text-foreground">{t("auth.fields.country")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <input type="hidden" {...field} />
                        <button
                          type="button"
                          className={cn(
                            AUTH_INPUT,
                            "flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2.5 font-normal",
                            locale === "ar" ? "text-right" : "text-left",
                          )}
                          onClick={() => {
                            setCountryPickerOpen((v) => !v);
                            setCityPickerOpen(false);
                          }}
                        >
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            {selectedCountry ? (
                              <>
                                <span className="shrink-0 text-lg leading-none" aria-hidden>
                                  {countryCodeToFlagEmoji(selectedCountry.code)}
                                </span>
                                <span className="truncate">{selectedCountry.name}</span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">
                                {t("auth.signup.choose_country")}
                              </span>
                            )}
                          </span>
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground opacity-80" />
                        </button>

                        {countryPickerOpen && (
                          <div
                            className={cn(
                              AUTH_POPOVER_PANEL,
                              "absolute left-0 right-0 z-50 mt-1.5 max-h-60 w-full min-w-0 overflow-y-auto p-1 shadow-2xl",
                            )}
                          >
                            {SIGNUP_COUNTRIES.map((country) => (
                              <button
                                key={country.code}
                                type="button"
                                className={cn(
                                  AUTH_SELECT_ROW,
                                  field.value === country.code && "border-primary/35 bg-[#0A0A0A]/90",
                                )}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  field.onChange(country.code);
                                  form.setValue("city", "");
                                  setCityQuery("");
                                  setCitySelectedFromSuggestions(false);
                                  setCityPickerOpen(false);
                                  setCountryPickerOpen(false);
                                }}
                              >
                                <span className="text-lg leading-none" aria-hidden>
                                  {countryCodeToFlagEmoji(country.code)}
                                </span>
                                <span className="min-w-0 flex-1 truncate">{country.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage>{fieldErrorMsg(form.formState.errors.countryCode?.message)}</FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem className={cn("relative", cityPickerOpen && "z-[50] isolate")}>
                    <FormLabel className="text-foreground">{t("auth.fields.city")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <button
                          type="button"
                          disabled={!selectedCountry}
                          onClick={() => {
                            if (!selectedCountry) return;
                            setCityPickerOpen((v) => !v);
                            setCountryPickerOpen(false);
                          }}
                          className={cn(
                            AUTH_INPUT,
                            "flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2.5 font-normal disabled:opacity-50",
                            locale === "ar" ? "text-right" : "text-left",
                          )}
                        >
                          <span
                            className={cn(
                              "min-w-0 flex-1 truncate",
                              locale === "ar" ? "text-right" : "text-left",
                            )}
                          >
                            {field.value ||
                              (selectedCountry
                                ? t("auth.signup.choose_city")
                                : t("auth.signup.choose_country_first"))}
                          </span>
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground opacity-80" />
                        </button>

                        {cityPickerOpen && selectedCountry && (
                          <div
                            className={cn(
                              AUTH_POPOVER_PANEL,
                              "absolute left-0 right-0 z-50 mt-1.5 w-full min-w-0 p-2 shadow-2xl",
                            )}
                          >
                            <Input
                              autoFocus
                              placeholder={
                                cityListAllowsManual &&
                                countryCities.length === 0 &&
                                cityListLoadState === "ready"
                                  ? t("auth.signup.manual_city_placeholder")
                                  : t("auth.signup.search_city")
                              }
                              value={cityQuery}
                              onChange={(e) => {
                                const value = e.target.value;
                                setCityQuery(value);
                                field.onChange("");
                                setCitySelectedFromSuggestions(false);
                              }}
                              className={cn(AUTH_INPUT, "mb-2")}
                            />
                            {cityListLoadState === "loading" ? (
                              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                                {t("auth.signup.cities_loading")}
                              </div>
                            ) : cityListLoadState === "error" ? (
                              <div className="space-y-3 rounded-lg border border-destructive/25 bg-destructive/5 p-4 text-center text-sm text-muted-foreground">
                                <p>{t("auth.signup.cities_load_error")}</p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                  }}
                                  onClick={() => setCityListRetryNonce((n) => n + 1)}
                                >
                                  {t("auth.signup.cities_retry")}
                                </Button>
                              </div>
                            ) : (
                              <>
                                {cityListAllowsManual && countryCities.length === 0 ? (
                                  <div className="mb-2 rounded-lg border border-primary/20 bg-[#0A0A0A]/60 p-3 text-sm leading-relaxed text-muted-foreground">
                                    <p>{t("auth.signup.manual_city_hint")}</p>
                                    {cityQuery.trim().length >= 2 ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className={cn("mt-3 w-full border-primary/35")}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          const v = cityQuery.trim();
                                          setCityQuery(v);
                                          field.onChange(v);
                                          setCitySelectedFromSuggestions(true);
                                          setCityPickerOpen(false);
                                        }}
                                      >
                                        {t("auth.signup.manual_city_confirm")}
                                      </Button>
                                    ) : (
                                      <p className="mt-2 text-xs text-muted-foreground/90">
                                        {t("auth.signup.manual_city_min_chars")}
                                      </p>
                                    )}
                                  </div>
                                ) : null}
                                {countryCities.length === 0 && !cityListAllowsManual ? (
                                  <div className="py-8 text-center text-sm text-muted-foreground">
                                    {t("auth.signup.no_cities_for_country")}
                                  </div>
                                ) : countryCities.length > 0 ? (
                                  <div
                                    className="max-h-[min(50dvh,280px)] touch-pan-y space-y-2 overflow-y-auto overscroll-y-contain px-0.5 py-1"
                                    role="listbox"
                                    aria-label={t("auth.signup.city_list_aria")}
                                  >
                                    {(cityQuery.trim().length < 2
                                      ? countryCities.slice(0, 80)
                                      : citySuggestions
                                    ).map((city) => (
                                      <button
                                        key={city}
                                        type="button"
                                        role="option"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          setCityQuery(city);
                                          field.onChange(city);
                                          setCitySelectedFromSuggestions(true);
                                          setCityPickerOpen(false);
                                        }}
                                        className={cn(
                                          AUTH_CITY_CARD_ROW,
                                          field.value === city &&
                                            "border-primary/48 bg-[#0A0A0A]/95 shadow-[0_0_20px_-10px_hsl(var(--primary)/0.28)] ring-primary/22",
                                        )}
                                      >
                                        <span className="min-w-0 flex-1 truncate text-right">{city}</span>
                                      </button>
                                    ))}
                                  </div>
                                ) : null}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage>{fieldErrorMsg(form.formState.errors.city?.message)}</FormMessage>
                  </FormItem>
                )}
              />

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
                    <FormMessage>{fieldErrorMsg(form.formState.errors.email?.message)}</FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">{t("auth.fields.phone")}</FormLabel>
                    <FormControl>
                      <div className="flex gap-2" dir="ltr">
                        <Input
                          value={phoneCode}
                          readOnly
                          disabled
                          className={cn(AUTH_INPUT, "w-28 shrink-0 text-center")}
                          placeholder="+00"
                        />
                        <Input
                          type="tel"
                          dir="ltr"
                          className={cn(AUTH_INPUT, "text-left")}
                          placeholder="1761234567"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage>{fieldErrorMsg(form.formState.errors.phoneNumber?.message)}</FormMessage>
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
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className={cn(
                            AUTH_INPUT,
                            locale === "ar" ? "pl-10" : "pr-10",
                          )}
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className={cn(
                            "absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary",
                            locale === "ar" ? "left-3" : "right-3",
                          )}
                          aria-label={
                            showPassword
                              ? t("auth.aria.hide_password")
                              : t("auth.aria.show_password")
                          }
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage>{fieldErrorMsg(form.formState.errors.password?.message)}</FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">{t("auth.fields.confirm_password")}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className={cn(
                            AUTH_INPUT,
                            locale === "ar" ? "pl-10" : "pr-10",
                          )}
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          className={cn(
                            "absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary",
                            locale === "ar" ? "left-3" : "right-3",
                          )}
                          aria-label={
                            showConfirmPassword
                              ? t("auth.aria.hide_confirm_password")
                              : t("auth.aria.show_confirm_password")
                          }
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage>
                      {fieldErrorMsg(form.formState.errors.confirmPassword?.message)}
                    </FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="acceptTerms"
                render={({ field }) => (
                  <FormItem>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-primary/20 bg-[#0A0A0A]/50 p-3 text-sm ring-1 ring-primary/5 transition-colors hover:border-primary/30">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-primary/40 accent-primary"
                      />
                      <span className="text-foreground">
                        {t("auth.signup.agree_to")}{" "}
                        <Link
                          href={appendReturnToQuery("/terms", "/signup")}
                          className="font-medium text-primary underline underline-offset-2"
                          onClick={() => {
                            stashLegalNavigationReturn("/signup");
                            stashLegalExplicitReturn("/signup");
                            stashReturnTarget("/signup");
                          }}
                        >
                          {t("auth.signup.terms_link")}
                        </Link>
                      </span>
                    </label>
                    <FormMessage>{fieldErrorMsg(form.formState.errors.acceptTerms?.message)}</FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="acceptPrivacy"
                render={({ field }) => (
                  <FormItem>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-primary/20 bg-[#0A0A0A]/50 p-3 text-sm ring-1 ring-primary/5 transition-colors hover:border-primary/30">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-primary/40 accent-primary"
                      />
                      <span className="text-foreground">
                        {t("auth.signup.agree_to")}{" "}
                        <Link
                          href={appendReturnToQuery("/privacy", "/signup")}
                          className="font-medium text-primary underline underline-offset-2"
                          onClick={() => {
                            stashLegalNavigationReturn("/signup");
                            stashLegalExplicitReturn("/signup");
                            stashReturnTarget("/signup");
                          }}
                        >
                          {t("auth.signup.privacy_link")}
                        </Link>
                      </span>
                    </label>
                    <FormMessage>{fieldErrorMsg(form.formState.errors.acceptPrivacy?.message)}</FormMessage>
                  </FormItem>
                )}
              />

              {error && (
                <p className="rounded-xl border border-destructive/35 bg-destructive/10 p-3 text-center text-sm text-destructive ring-1 ring-destructive/20">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="ghost"
                disabled={isSubmitting || rateLimitSeconds > 0}
                className={cn(AUTH_ACCENT_OUTLINE_BTN, "mt-1 hover:bg-black/30")}
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : rateLimitSeconds > 0 ? (
                  t("auth.signup.wait_seconds", { seconds: rateLimitSeconds })
                ) : (
                  t("auth.signup.submit")
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {t("auth.signup.verification_note")}
              </p>
            </form>
          </Form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {t("auth.signup.has_account")}{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            {t("auth.login.title")}
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
