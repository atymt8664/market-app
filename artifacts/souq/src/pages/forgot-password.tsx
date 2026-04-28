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

const schema = z.object({
  email: z.string().email("بريد إلكتروني غير صحيح"),
});

type Values = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: Values) => {
    setApiError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
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
        setApiError(json.error || "تعذر إرسال رابط إعادة التعيين، حاول مرة أخرى.");
        return;
      }
      setSubmitted(true);
    } catch {
      setApiError("تعذر إرسال رابط إعادة التعيين، تحقق من الاتصال وحاول مجدداً.");
    } finally {
      setIsSubmitting(false);
    }
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
        <h1 className="font-bold text-lg">استعادة كلمة المرور</h1>
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
            <h2 className="text-2xl font-bold">نسيت كلمة المرور؟</h2>
            <p className="text-sm text-muted-foreground">
            أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور
            </p>
          </div>
        </div>

        {submitted ? (
          <div className="rounded-2xl border border-border bg-background/80 p-5 shadow-xl backdrop-blur">
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <h3 className="font-bold">تم إرسال الرابط</h3>
              <p className="text-sm text-muted-foreground">
                إذا كان البريد الإلكتروني مسجلاً لدينا، فستجد رسالة تتضمّن
                رابطاً لإعادة تعيين كلمة المرور خلال دقائق.
              </p>
              <Link href="/login" className="w-full">
                <Button variant="outline" className="h-12 w-full font-bold">
                  العودة لتسجيل الدخول
                </Button>
              </Link>
              <Link
                href="/forgot-password"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                إرسال رابط جديد
              </Link>
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>البريد الإلكتروني</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          dir="ltr"
                          className="text-right"
                          placeholder="name@email.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {apiError && (
                  <p className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-center text-sm text-destructive">
                    {apiError}
                  </p>
                )}
                <Button
                  type="submit"
                  className="mt-2 h-12 text-base font-bold rounded-xl shadow-lg transition-all hover:scale-[1.01]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "إرسال رابط الاستعادة"
                  )}
                </Button>
                <Link
                  href="/login"
                  className="text-center text-sm text-muted-foreground hover:text-foreground"
                >
                  تذكّرت كلمة المرور؟ تسجيل الدخول
                </Link>
              </form>
            </Form>
          </div>
        )}
      </div>
    </motion.div>
  );
}
