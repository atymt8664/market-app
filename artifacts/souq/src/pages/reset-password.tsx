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
import { Button } from "@/components/ui/button";

const schema = z
  .object({
    password: z
      .string()
      .min(
        1,
        "كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم، ولا تقل عن 8 أحرف",
      ),
    confirm: z.string().min(1, "تأكيد كلمة المرور مطلوب"),
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
          "كلمة المرور يجب أن تحتوي على حرف كبير وحرف صغير ورقم، ولا تقل عن 8 أحرف",
      });
    }
    if (values.password !== values.confirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirm"],
        message: "كلمة المرور وتأكيد كلمة المرور غير متطابقين",
      });
    }
  });

type Values = z.infer<typeof schema>;

export default function ResetPassword() {
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
    if (!t) setError("رابط إعادة التعيين غير صالح أو منتهي الصلاحية");
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
            e?.data?.error || "رابط إعادة التعيين غير صالح أو منتهي الصلاحية",
          );
        },
      },
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[100dvh] w-full flex-col bg-gradient-to-b from-background to-muted/30"
    >
      <header className="sticky top-0 z-40 flex items-center gap-4 border-b border-border bg-background/80 p-4 backdrop-blur">
        <Link href="/login">
          <button
            type="button"
            className="rounded-full p-2 -mr-2 transition-all hover:bg-muted active:scale-95"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </Link>
        <h1 className="font-bold text-lg">تعيين كلمة مرور جديدة</h1>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-5 pb-8 pt-10 sm:px-6">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
            <div className="absolute h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-primary/25 bg-primary/10 shadow-xl">
              <KeyRound className="h-10 w-10 text-primary" />
            </div>
          </div>
          <div className="space-y-1 text-center">
            <h2 className="text-2xl font-bold">كلمة مرور جديدة</h2>
            <p className="text-sm text-muted-foreground">
              أدخل كلمة المرور الجديدة لحسابك
            </p>
          </div>
        </div>

        {done ? (
          <div className="rounded-2xl border border-border bg-background/80 p-5 shadow-xl backdrop-blur">
            <div className="flex flex-col items-center gap-3 text-center">
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <h3 className="font-bold">تم تحديث كلمة المرور</h3>
              <p className="text-sm text-muted-foreground">
                يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-background/80 p-5 shadow-xl backdrop-blur">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col gap-4"
                dir="rtl"
              >
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>كلمة المرور الجديدة</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pr-11"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label={
                              showPassword
                                ? "إخفاء كلمة المرور"
                                : "إظهار كلمة المرور"
                            }
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirm"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تأكيد كلمة المرور</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="pr-11"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword((prev) => !prev)
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label={
                              showConfirmPassword
                                ? "إخفاء تأكيد كلمة المرور"
                                : "إظهار تأكيد كلمة المرور"
                            }
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {error && (
                  <p className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-center text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  className="mt-2 h-12 rounded-xl text-base font-bold shadow-lg transition-all hover:scale-[1.01]"
                  disabled={mut.isPending || !token}
                >
                  {mut.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "حفظ كلمة المرور"
                  )}
                </Button>
              </form>
            </Form>
          </div>
        )}
      </div>
    </motion.div>
  );
}
