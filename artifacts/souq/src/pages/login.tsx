import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowRight, Loader2, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthLogin, getAuthMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  email: z.string().email("بريد إلكتروني غير صحيح"),
  password: z.string().min(6, "كلمة المرور قصيرة جداً"),
});

type Values = z.infer<typeof schema>;

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const loginMutation = useAuthLogin();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: Values) => {
    setError(null);
    loginMutation.mutate(
      { data },
      {
        onSuccess: async () => {
          await queryClient.invalidateQueries({ queryKey: getAuthMeQueryKey() });
          toast({ title: "تم تسجيل الدخول بنجاح" });
          const params = new URLSearchParams(window.location.search);
          navigate(params.get("redirect") || "/");
        },
        onError: async (err: unknown) => {
          const e = err as { status?: number; data?: { code?: string; email?: string } };
          if (e?.status === 403 && e?.data?.code === "EMAIL_NOT_VERIFIED") {
            const targetEmail = e.data.email || data.email;
            const params = new URLSearchParams({ email: targetEmail });
            toast({
              title: "البريد غير مُفعّل",
              description: "أدخل رمز التفعيل لإكمال الدخول",
            });
            navigate(`/verify-email?${params.toString()}`);
            return;
          }
          setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
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
        <h1 className="font-bold text-lg">تسجيل الدخول</h1>
      </header>

      <div className="p-6 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 pt-4 pb-2">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
            <LogIn className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold">أهلاً بعودتك</h2>
          <p className="text-sm text-muted-foreground text-center">
            سجّل الدخول لإدارة إعلاناتك ومتابعة المفضلة
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
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

            <Button type="submit" className="py-6 text-base font-bold mt-2" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "تسجيل الدخول"}
            </Button>
          </form>
        </Form>

        <p className="text-center text-sm text-muted-foreground">
          ليس لديك حساب؟{" "}
          <Link href="/signup" className="text-primary font-bold hover:underline">
            إنشاء حساب جديد
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
