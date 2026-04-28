import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  Bell,
  ChevronLeft,
  CreditCard,
  Globe,
  HelpCircle,
  Info,
  Lock,
  LogOut,
  Mail,
  Moon,
  Shield,
  Star,
  User as UserIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  useAuthLogout,
  getAuthMeQueryKey,
  getListMyAdsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface RowProps {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
  destructive?: boolean;
}

function Row({ icon, label, hint, onClick, trailing, destructive }: RowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 active:bg-muted transition-colors text-right border-b border-border/30 last:border-0"
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          destructive
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-foreground"
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 flex flex-col items-start min-w-0">
        <span
          className={`text-sm font-medium ${destructive ? "text-destructive" : ""}`}
        >
          {label}
        </span>
        {hint && (
          <span className="text-xs text-muted-foreground truncate">{hint}</span>
        )}
      </div>
      {trailing ?? (
        <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
      )}
    </button>
  );
}

function Section({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4">
      {title && (
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
          {title}
        </h2>
      )}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {children}
      </div>
    </section>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const logoutMutation = useAuthLogout();

  // Dark mode toggle (theme is dark by default; this lets the user switch)
  const [darkMode, setDarkMode] = useState(true);
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const isDark = saved !== "light";
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);
  const toggleDark = (next: boolean) => {
    setDarkMode(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  const [notifications, setNotifications] = useState(() => {
    return localStorage.getItem("pref_notifications") !== "off";
  });
  const toggleNotifications = (next: boolean) => {
    setNotifications(next);
    localStorage.setItem("pref_notifications", next ? "on" : "off");
  };

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: async () => {
        // Keep UX prefs, but clear auth/session-like local data.
        localStorage.removeItem("favorites");
        sessionStorage.clear();

        queryClient.setQueryData(getAuthMeQueryKey(), null);
        queryClient.removeQueries({ queryKey: getAuthMeQueryKey() });
        queryClient.removeQueries({ queryKey: getListMyAdsQueryKey() });
        await queryClient.invalidateQueries();

        navigate("/login");
      },
    });
  };

  const go = (path: string) => () => navigate(path);
  void toast;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col w-full min-h-[100dvh] bg-background pb-8"
    >
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="mx-auto w-full max-w-[900px] md:max-w-[760px] lg:max-w-[860px] px-4 md:px-6 py-4 flex items-center gap-3">
          <Link href="/profile">
            <button className="p-2 -mr-2 rounded-full hover:bg-muted active:scale-95 transition-all">
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
          <h1 className="font-bold text-lg">الإعدادات</h1>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[900px] md:max-w-[760px] lg:max-w-[860px] px-4 md:px-6 py-5">
        {user && (
          <Section>
            <div className="flex items-center gap-3 p-4">
              <div className="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xl font-bold shrink-0">
                {(user.name || user.email || "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{user.name}</div>
                <div className="text-sm text-muted-foreground truncate" dir="ltr">
                  {user.email}
                </div>
              </div>
            </div>
          </Section>
        )}

        <Section title="الحساب">
        <Row
          icon={<UserIcon className="w-4 h-4" />}
          label="الملف الشخصي"
          hint="الاسم، الهاتف، المدينة"
          onClick={go("/account/profile")}
        />
        <Row
          icon={<Mail className="w-4 h-4" />}
          label="البريد الإلكتروني"
          hint={user?.emailVerified ? "مُفعّل" : "غير مُفعّل"}
          onClick={go("/account/email")}
        />
        <Row
          icon={<Lock className="w-4 h-4" />}
          label="تغيير كلمة المرور"
          onClick={go("/account/password")}
        />
        <Row
          icon={<CreditCard className="w-4 h-4" />}
          label="المدفوعات"
          hint="قريباً"
          onClick={go("/account/payments")}
        />
        </Section>

        <Section title="التخصيص">
        <Row
          icon={<Bell className="w-4 h-4" />}
          label="الإشعارات"
          trailing={
            <Switch
              checked={notifications}
              onCheckedChange={toggleNotifications}
            />
          }
        />
        <Row
          icon={<Moon className="w-4 h-4" />}
          label="الوضع الداكن"
          trailing={<Switch checked={darkMode} onCheckedChange={toggleDark} />}
        />
        <Row
          icon={<Globe className="w-4 h-4" />}
          label="اللغة"
          hint="العربية"
          onClick={go("/account/language")}
        />
        </Section>

        <Section title="الخصوصية والأمان">
        <Row
          icon={<Shield className="w-4 h-4" />}
          label="الخصوصية"
          onClick={go("/account/privacy")}
        />
        <Row
          icon={<Lock className="w-4 h-4" />}
          label="الأمان"
          onClick={go("/account/security")}
        />
        </Section>

        <Section title="عن التطبيق">
        <Row
          icon={<Star className="w-4 h-4" />}
          label="قيّم التطبيق"
          onClick={go("/account/rate")}
        />
        <Row
          icon={<HelpCircle className="w-4 h-4" />}
          label="المساعدة والدعم"
          onClick={go("/account/help")}
        />
        <Row
          icon={<Info className="w-4 h-4" />}
          label="عن سوق العرب"
          hint="الإصدار 1.0.0"
          onClick={go("/account/about")}
        />
        </Section>

        {user && (
          <div className="pt-1">
            <Button
              variant="outline"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="w-full py-5 text-sm md:text-base font-medium gap-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="w-5 h-5" /> تسجيل الخروج
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
