import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowRight, Loader2, KeyRound, CheckCircle2 } from "lucide-react";
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
    password: z.string().min(6, "كلمة المرور قصيرة جداً"),
    confirm: z.string().min(6),
  })
  .refine((d) => d.password === d.confirm, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirm"],
  });

type Values = z.infer<typeof schema>;

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const mut = useAuthResetPassword();
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token") || "";
    setToken(t);
    if (!t) setError("الرابط غير صالح");
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
            e?.data?.error || "تعذّر إعادة التعيين. ربما انتهت صلاحية الرابط.",
          );
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
        <h1 className="font-bold text-lg">تعيين كلمة مرور جديدة</h1>
      </header>

      <div className="p-6 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 pt-4 pb-2">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
            <KeyRound className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold">كلمة مرور جديدة</h2>
          <p className="text-sm text-muted-foreground text-center">
            أدخل كلمة المرور الجديدة لحسابك
          </p>
        </div>

        {done ? (
          <div className="bg-primary/10 border border-primary/30 rounded-2xl p-5 flex flex-col items-center text-center gap-2">
            <CheckCircle2 className="w-10 h-10 text-primary" />
            <h3 className="font-bold">تم تحديث كلمة المرور</h3>
            <p className="text-sm text-muted-foreground">
              يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.
            </p>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
            >
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>كلمة المرور الجديدة</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
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
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
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
                className="py-6 text-base font-bold mt-2"
                disabled={mut.isPending || !token}
              >
                {mut.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "حفظ كلمة المرور"
                )}
              </Button>
            </form>
          </Form>
        )}
      </div>
    </motion.div>
  );
}
