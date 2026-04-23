import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowRight, Loader2, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthSignup, getAuthMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  name: z.string().min(2, "الاسم قصير جداً"),
  email: z.string().email("بريد إلكتروني غير صحيح"),
  phone: z.string().min(5, "رقم الهاتف مطلوب"),
  city: z.string().optional(),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

type Values = z.infer<typeof schema>;

export default function Signup() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const signupMutation = useAuthSignup();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", city: "", password: "" },
  });

  const onSubmit = (data: Values) => {
    setError(null);
    signupMutation.mutate(
      { data: { ...data, city: data.city ?? "" } },
      {
        onSuccess: async (resp: { email: string; devVerificationCode?: string }) => {
          await queryClient.invalidateQueries({ queryKey: getAuthMeQueryKey() });
          toast({
            title: "تم إنشاء الحساب",
            description: resp?.devVerificationCode
              ? `رمز التفعيل (وضع التطوير): ${resp.devVerificationCode}`
              : "أرسلنا رمز التفعيل إلى بريدك الإلكتروني",
          });
          const params = new URLSearchParams();
          params.set("email", resp.email);
          if (resp?.devVerificationCode) params.set("code", resp.devVerificationCode);
          navigate(`/verify-email?${params.toString()}`);
        },
        onError: (err: unknown) => {
          const e = err as { status?: number };
          if (e?.status === 409) {
            setError("هذا البريد الإلكتروني مسجّل مسبقاً");
          } else {
            setError("تعذّر إنشاء الحساب، حاول مرة أخرى");
          }
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
          <h2 className="text-xl font-bold">انضمّ إلى السوق</h2>
          <p className="text-sm text-muted-foreground text-center">
            أنشئ حساباً مجاناً لنشر إعلاناتك والتواصل مع الباعة
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الاسم الكامل</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: أحمد محمد" {...field} />
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
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم الهاتف (واتساب)</FormLabel>
                  <FormControl>
                    <Input type="tel" dir="ltr" className="text-right" placeholder="+491761234567" {...field} />
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
                  <FormLabel>المدينة (اختياري)</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: Berlin" {...field} />
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

            <Button type="submit" className="py-6 text-base font-bold mt-2" disabled={signupMutation.isPending}>
              {signupMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "إنشاء الحساب"}
            </Button>
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
