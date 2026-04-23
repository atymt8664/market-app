import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowRight, Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthForgotPassword } from "@workspace/api-client-react";
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
  const mut = useAuthForgotPassword();
  const [submitted, setSubmitted] = useState(false);
  const [devUrl, setDevUrl] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = (data: Values) => {
    mut.mutate(
      { data },
      {
        onSuccess: (res) => {
          setSubmitted(true);
          if (res.devResetUrl) setDevUrl(res.devResetUrl);
        },
        onError: () => {
          setSubmitted(true);
        },
      },
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col w-full min-h-[100dvh] bg-background"
    >
      <header className="sticky top-0 z-40 bg-background border-b border-border p-4 flex items-center gap-4">
        <Link href="/login">
          <button className="p-2 -mr-2 rounded-full hover:bg-muted active:scale-95 transition-all">
            <ArrowRight className="w-5 h-5" />
          </button>
        </Link>
        <h1 className="font-bold text-lg">استعادة كلمة المرور</h1>
      </header>

      <div className="p-6 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 pt-4 pb-2">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
            <KeyRound className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold">نسيت كلمة المرور؟</h2>
          <p className="text-sm text-muted-foreground text-center">
            أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور
          </p>
        </div>

        {submitted ? (
          <div className="flex flex-col gap-4">
            <div className="bg-primary/10 border border-primary/30 rounded-2xl p-5 flex flex-col items-center text-center gap-2">
              <CheckCircle2 className="w-10 h-10 text-primary" />
              <h3 className="font-bold">تم إرسال الرابط</h3>
              <p className="text-sm text-muted-foreground">
                إذا كان البريد الإلكتروني مسجلاً لدينا، فستجد رسالة تتضمّن
                رابطاً لإعادة تعيين كلمة المرور خلال دقائق.
              </p>
            </div>
            {devUrl && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs">
                <div className="font-bold mb-1 text-amber-600 dark:text-amber-400">
                  وضع التطوير
                </div>
                <p className="text-muted-foreground mb-2">
                  لا يوجد مزود بريد متصل بعد. استخدم الرابط التالي مباشرة:
                </p>
                <a
                  href={devUrl}
                  className="text-primary underline break-all"
                  dir="ltr"
                >
                  {devUrl}
                </a>
              </div>
            )}
            <Link href="/login">
              <Button variant="outline" className="w-full py-5">
                العودة لتسجيل الدخول
              </Button>
            </Link>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
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
              <Button
                type="submit"
                className="py-6 text-base font-bold mt-2"
                disabled={mut.isPending}
              >
                {mut.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
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
        )}
      </div>
    </motion.div>
  );
}
