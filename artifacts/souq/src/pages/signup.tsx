import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowRight, Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
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
import {
  SIGNUP_COUNTRIES,
  SIGNUP_COUNTRY_BY_CODE,
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
      const res = await fetch("/api/auth/signup", {
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
      className="flex flex-col w-full min-h-[100dvh] bg-background"
    >
      <header className="sticky top-0 z-40 bg-background border-b border-border p-4 flex items-center gap-4">
        <Link href="/">
          <button className="p-2 -mr-2 rounded-full hover:bg-muted active:scale-95 transition-all">
            <ArrowRight className="w-5 h-5" />
          </button>
        </Link>
        <h1 className="font-bold text-lg">إنشاء حساب</h1>
      </header>

      <div className="p-6 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 pt-4 pb-2">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
            <UserPlus className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold">أهلاً بك في سوق العرب EU</h2>
          <p className="text-sm text-muted-foreground text-center">
            أنشئ حسابك مجانًا لبيع وشراء المنتجات بسهولة والتواصل مع المستخدمين في أوروبا وأمريكا وكندا
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الاسم الأول</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: محمد" {...field} />
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
                  <FormLabel>اسم العائلة</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: أحمد" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="countryCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الدولة</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm"
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        form.setValue("city", "");
                        setCityQuery("");
                        setCitySelectedFromSuggestions(false);
                        setCityPickerOpen(false);
                      }}
                    >
                      <option value="">اختر الدولة</option>
                      {SIGNUP_COUNTRIES.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المدينة</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <button
                        type="button"
                        disabled={!selectedCountry}
                        onClick={() => {
                          if (!selectedCountry) return;
                          setCityPickerOpen((v) => !v);
                        }}
                        className="w-full h-11 rounded-md border border-input bg-background px-3 text-sm text-right disabled:opacity-60"
                      >
                        {field.value || (selectedCountry ? "اختر المدينة" : "اختر الدولة أولاً")}
                      </button>

                      {cityPickerOpen && selectedCountry && (
                        <div className="absolute z-30 mt-1 w-full rounded-md border border-border bg-popover shadow-md p-2">
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
                            className="mb-2"
                          />
                          <div className="max-h-56 overflow-auto rounded-md border border-border/50">
                            {(cityQuery.trim().length < 2
                              ? countryCities.slice(0, 80)
                              : citySuggestions
                            ).map((city) => (
                              <button
                                key={city}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setCityQuery(city);
                                  field.onChange(city);
                                  setCitySelectedFromSuggestions(true);
                                  setCityPickerOpen(false);
                                }}
                                className="w-full px-3 py-2 text-right text-sm hover:bg-muted border-b border-border/30 last:border-0"
                              >
                                {city}
                              </button>
                            ))}
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
                  <FormLabel>البريد الإلكتروني</FormLabel>
                  <FormControl>
                    <Input type="email" dir="ltr" className="text-right" placeholder="name@email.com" {...field} />
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
                  <FormLabel>رقم الهاتف</FormLabel>
                  <FormControl>
                    <div className="flex gap-2" dir="ltr">
                      <Input value={phoneCode} readOnly disabled className="w-28 text-center" placeholder="+00" />
                      <Input
                        type="tel"
                        dir="ltr"
                        className="text-left"
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
                  <FormLabel>كلمة المرور</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                  <FormLabel>تأكيد كلمة المرور</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        aria-label={showConfirmPassword ? "إخفاء تأكيد كلمة المرور" : "إظهار تأكيد كلمة المرور"}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                    <span>أوافق على الشروط والأحكام</span>
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
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                    <span>أوافق على سياسة الخصوصية</span>
                  </label>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-center">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || rateLimitSeconds > 0}
              className="w-[55%] mx-auto py-3 rounded-2xl bg-primary text-black font-bold text-sm shadow-md hover:scale-[1.02] active:scale-[0.97] transition-all mt-3"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
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

        <p className="text-center text-sm text-muted-foreground">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="text-primary font-bold hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
