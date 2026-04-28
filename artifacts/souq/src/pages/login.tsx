import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowRight, Loader2, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import { getAuthMeQueryKey } from "@workspace/api-client-react";
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

const schema = z.object({
  email: z.string().email("بريد إلكتروني غير صحيح"),
  password: z
    .string()
    .min(1, "كلمة المرور مطلوبة")
    .min(6, "كلمة المرور قصيرة جداً"),
});

type Values = z.infer<typeof schema>;

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: Values) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const text = await res.text();
      const json = text ? JSON.parse(text) : {};

      if (!res.ok) {
        if (res.status === 403 && json?.code === "EMAIL_NOT_VERIFIED") {
          const params = new URLSearchParams({ email: json?.email || data.email });

          toast({
            title: "البريد غير مُفعّل",
            description: "أدخل رمز التفعيل لإكمال الدخول",
          });

          navigate(`/verify-email?${params.toString()}`);
          return;
        }

        throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      }

      toast({ title: "تم تسجيل الدخول بنجاح" });
      queryClient.setQueryData(getAuthMeQueryKey(), json);
      await queryClient.invalidateQueries({ queryKey: getAuthMeQueryKey() });

      const params = new URLSearchParams(window.location.search);
      navigate(params.get("redirect") || "/");

    } catch (err: any) {
      setError(err.message || "فشل تسجيل الدخول");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col w-full min-h-[100dvh] bg-gradient-to-b from-background to-muted/30"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border p-4 flex items-center gap-4">
        <Link href="/">
          <button className="p-2 -mr-2 rounded-full hover:bg-muted active:scale-95 transition-all">
            <ArrowRight className="w-5 h-5" />
          </button>
        </Link>
        <h1 className="font-bold text-lg">تسجيل الدخول</h1>
      </header>

      {/* Content */}
      <div className="flex flex-col gap-8 px-6 pt-10 pb-6">
        {/* Icon + Title */}
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex items-center justify-center">
            {/* Glow */}
            <div className="absolute w-44 h-44 rounded-full bg-primary/20 blur-3xl"></div>

            {/* Circle */}
            <div className="relative w-28 h-28 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shadow-xl">
              <LogIn className="w-12 h-12 text-primary" />
            </div>
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold">أهلاً بعودتك 👋</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              سجّل الدخول لإدارة إعلاناتك ومتابعة المفضلة بسهولة
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-background/80 backdrop-blur border border-border rounded-2xl p-5 shadow-xl">
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

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>كلمة المرور</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
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
                className="h-14 text-base font-bold mt-2 rounded-xl shadow-lg hover:scale-[1.02] transition-all"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "تسجيل الدخول"
                )}
              </Button>

              <Link
                href="/forgot-password"
                className="text-center text-sm text-primary hover:underline"
              >
                نسيت كلمة المرور؟
              </Link>
            </form>
          </Form>
        </div>

        {/* Signup */}
        <p className="text-center text-sm text-muted-foreground">
          ليس لديك حساب؟{" "}
          <Link
            href="/signup"
            className="text-primary font-bold hover:underline"
          >
            إنشاء حساب جديد
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
