import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowRight, ChevronDown, Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
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
  AUTH_HEADER_TITLE,
  AUTH_HERO_CARD,
  AUTH_INPUT,
  AUTH_PAGE_BG,
  AUTH_POPOVER_PANEL,
  AUTH_SELECT_ROW,
} from "@/lib/auth-page-styles";
import {
  SIGNUP_COUNTRIES,
  SIGNUP_COUNTRY_BY_CODE,
  countryCodeToFlagEmoji,
  getCitiesByCountry,
  getPhoneCodeFromCountry,
} from "@/lib/signup-location-data";

const schema = z
  .object({
    firstName: z.string().min(1, "الاسم الأول مطلوب"),
    lastName: z.string().min(1, "اسم العائلة مطلوب"),
    countryCode: z.string().min(1, "الرجاء اختيار الدولة"),
    city: z.string().min(1, "الرجاء اختيار المدينة من القائمة"),
    email: z.string().email("بريد إلكتروني غير صحيح"),
    phoneNumber: z.string().regex(/^[0-9]{6,15}$/, "رقم الهاتف غير صحيح لهذه الدولة"),
    password: z.string().min(1, "كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم، ولا تقل عن 8 أحرف"),
    confirmPassword: z.string().min(1, "تأكيد كلمة المرور مطلوب"),
    acceptTerms: z.boolean().refine((v) => v, "يجب الموافقة على الشروط والأحكام"),
    acceptPrivacy: z.boolean().refine((v) => v, "يجب الموافقة على سياسة الخصوصية"),
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
        message: "كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم، ولا تقل عن 8 أحرف",
      });
    }
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "كلمة المرور وتأكيد كلمة المرور غير متطابقين",
      });
    }
    const country = SIGNUP_COUNTRY_BY_CODE[values.countryCode];
    if (!country) return;
    if (!getCitiesByCountry(country.code).includes(values.city)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["city"],
        message: "الرجاء اختيار المدينة من القائمة",
      });
    }
  });

type Values = z.infer<typeof schema>;

export default function Signup() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  const selectedCountry = SIGNUP_COUNTRY_BY_CODE[form.watch("countryCode")];
  const phoneCode = selectedCountry?.phoneCode ?? getPhoneCodeFromCountry(form.watch("countryCode"));
  const countryCities = selectedCountry ? getCitiesByCountry(selectedCountry.code) : [];
  const citySuggestions =
    cityQuery.trim().length < 2 || !selectedCountry
      ? []
      : countryCities.filter((city) =>
          city.toLowerCase().includes(cityQuery.trim().toLowerCase()),
        );

  useEffect(() => {
    if (rateLimitSeconds <= 0) return;
    const timer = window.setTimeout(() => {
      setRateLimitSeconds((v) => Math.max(0, v - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [rateLimitSeconds]);

  const onSubmit = async (data: Values) => {
    setError(null);
    if (rateLimitSeconds > 0) {
      setError(`محاولات كثيرة، يرجى الانتظار ${rateLimitSeconds} ثانية ثم المحاولة مرة أخرى`);
      return;
    }
    if (!citySelectedFromSuggestions || !data.city) {
      form.setError("city", { type: "manual", message: "الرجاء اختيار المدينة من القائمة" });
      return;
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
          setError("هذا البريد الإلكتروني مسجّل مسبقاً");
          return;
        }
        if (res.status === 429) {
          const retryAfter = Number.parseInt(String(res.headers.get("retry-after") || ""), 10);
          const cooldown = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 30;
          setRateLimitSeconds(cooldown);
          setError("محاولات كثيرة، يرجى الانتظار قليلاً ثم المحاولة مرة أخرى");
          return;
        }
        if (hasFieldErrors) {
          return;
        }
        throw new Error(resp?.error || "تعذّر إنشاء الحساب، حاول مرة أخرى");
      }

      await queryClient.invalidateQueries();
      localStorage.setItem("email", resp.email || data.email);
      toast({
        title: "تم إنشاء الحساب",
        description: resp?.devVerificationCode
          ? `رمز التفعيل (وضع التطوير): ${resp.devVerificationCode}`
          : "أرسلنا رمز التفعيل إلى بريدك الإلكتروني",
      });
      const params = new URLSearchParams();
      params.set("email", resp.email || data.email);
      if (resp?.devVerificationCode) params.set("code", resp.devVerificationCode);
      navigate(`/verify-email?${params.toString()}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "تعذّر إنشاء الحساب، حاول مرة أخرى";
      setError(message);
    } finally {
      setIsSubmitting(false);
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
          <button type="button" className={AUTH_BACK_BUTTON} aria-label="رجوع">
            <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </Link>
        <h1 className={AUTH_HEADER_TITLE}>إنشاء حساب</h1>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-8 pt-6 md:px-5">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="absolute h-36 w-36 rounded-full bg-primary/15 blur-3xl" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-primary/35 bg-zinc-950/80 shadow-[0_0_24px_-12px_hsl(var(--primary)/0.35)] ring-1 ring-primary/15">
              <UserPlus className="h-11 w-11 text-primary" strokeWidth={2} />
            </div>
          </div>
          <div className={cn(AUTH_HERO_CARD, "w-full max-w-md space-y-1.5")}>
            <h2 className="text-lg font-bold text-foreground md:text-xl">أهلاً بك في سوق العرب EU</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              أنشئ حسابك مجانًا لبيع وشراء المنتجات بسهولة والتواصل مع المستخدمين في أوروبا وأمريكا وكندا
            </p>
          </div>
        </div>

        <div className={cn(AUTH_CARD, "overflow-visible")}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">الاسم الأول</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: محمد" className={AUTH_INPUT} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">اسم العائلة</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: أحمد" className={AUTH_INPUT} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="countryCode"
                render={({ field }) => (
                  <FormItem className={cn("relative", countryPickerOpen && "z-[50] isolate")}>
                    <FormLabel className="text-foreground">الدولة</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <input type="hidden" {...field} />
                        <button
                          type="button"
                          className={cn(
                            AUTH_INPUT,
                            "flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2.5 text-right font-normal",
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
                              <span className="text-muted-foreground">اختر الدولة</span>
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
                                  field.value === country.code && "border-primary/35 bg-zinc-900/90",
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem className={cn("relative", cityPickerOpen && "z-[50] isolate")}>
                    <FormLabel className="text-foreground">المدينة</FormLabel>
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
                            "flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2.5 text-right font-normal disabled:opacity-50",
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate text-right">
                            {field.value ||
                              (selectedCountry ? "اختر المدينة" : "اختر الدولة أولاً")}
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
                              placeholder="ابحث عن مدينة..."
                              value={cityQuery}
                              onChange={(e) => {
                                const value = e.target.value;
                                setCityQuery(value);
                                field.onChange("");
                                setCitySelectedFromSuggestions(false);
                              }}
                              className={cn(AUTH_INPUT, "mb-2")}
                            />
                            <div
                              className="max-h-[min(50dvh,280px)] touch-pan-y space-y-2 overflow-y-auto overscroll-y-contain px-0.5 py-1"
                              role="listbox"
                              aria-label="قائمة المدن"
                            >
                              {(cityQuery.trim().length < 2 ? countryCities.slice(0, 80) : citySuggestions).map(
                                (city) => (
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
                                        "border-primary/48 bg-zinc-900/95 shadow-[0_0_20px_-10px_hsl(var(--primary)/0.28)] ring-primary/22",
                                    )}
                                  >
                                    <span className="min-w-0 flex-1 truncate text-right">{city}</span>
                                  </button>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        dir="ltr"
                        className={cn(AUTH_INPUT, "text-right")}
                        placeholder="name@email.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">رقم الهاتف</FormLabel>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">كلمة المرور</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className={cn(AUTH_INPUT, "pl-10")}
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                          aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground">تأكيد كلمة المرور</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className={cn(AUTH_INPUT, "pl-10")}
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                          aria-label={
                            showConfirmPassword ? "إخفاء تأكيد كلمة المرور" : "إظهار تأكيد كلمة المرور"
                          }
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="acceptTerms"
                render={({ field }) => (
                  <FormItem>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-primary/20 bg-zinc-950/50 p-3 text-sm ring-1 ring-primary/5 transition-colors hover:border-primary/30">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-primary/40 accent-primary"
                      />
                      <span className="text-foreground">
                        أوافق على{" "}
                        <Link
                          href={appendReturnToQuery("/terms", "/signup")}
                          className="font-medium text-primary underline underline-offset-2"
                          onClick={() => {
                            stashLegalNavigationReturn("/signup");
                            stashLegalExplicitReturn("/signup");
                            stashReturnTarget("/signup");
                          }}
                        >
                          الشروط والأحكام
                        </Link>
                      </span>
                    </label>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="acceptPrivacy"
                render={({ field }) => (
                  <FormItem>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-primary/20 bg-zinc-950/50 p-3 text-sm ring-1 ring-primary/5 transition-colors hover:border-primary/30">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-primary/40 accent-primary"
                      />
                      <span className="text-foreground">
                        أوافق على{" "}
                        <Link
                          href={appendReturnToQuery("/privacy", "/signup")}
                          className="font-medium text-primary underline underline-offset-2"
                          onClick={() => {
                            stashLegalNavigationReturn("/signup");
                            stashLegalExplicitReturn("/signup");
                            stashReturnTarget("/signup");
                          }}
                        >
                          سياسة الخصوصية
                        </Link>
                      </span>
                    </label>
                    <FormMessage />
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
                className={cn(AUTH_ACCENT_OUTLINE_BTN, "mt-1 hover:bg-zinc-900")}
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : rateLimitSeconds > 0 ? (
                  `انتظر ${rateLimitSeconds}s`
                ) : (
                  "إنشاء الحساب"
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                سيصلك كود تفعيل عبر البريد الإلكتروني بعد إنشاء الحساب
              </p>
            </form>
          </Form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
