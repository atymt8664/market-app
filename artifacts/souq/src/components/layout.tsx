import { Link, useLocation } from "wouter";
import { Home, Heart, PlusCircle, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground flex justify-center">
      <div className="w-full max-w-[480px] min-h-[100dvh] relative pb-[64px] bg-card shadow-2xl overflow-x-hidden">
        {children}
        <BottomNav />
      </div>
    </div>
  );
}

function BottomNav() {
  const [location, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const handleCreateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast({ title: "يرجى تسجيل الدخول أولاً", description: "يجب أن يكون لديك حساب لنشر إعلان" });
      navigate("/login?redirect=/new");
      return;
    }
    navigate("/new");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="w-full max-w-[480px] h-[64px] bg-card border-t border-border flex items-center justify-around px-2 pointer-events-auto relative">
        <NavItem href="/" icon={<Home className="w-6 h-6" />} label="بحث" isActive={location === "/"} />
        <NavItem href="/favorites" icon={<Heart className="w-6 h-6" />} label="المفضلة" isActive={location === "/favorites"} />

        {/* Floating Action Button for Create Ad */}
        <div className="flex-1 flex flex-col items-center justify-end relative -top-3">
          <button
            onClick={handleCreateClick}
            className="w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:scale-95 active:scale-90 transition-transform duration-200 border-4 border-card"
            aria-label="إنشاء إعلان"
          >
            <PlusCircle className="w-8 h-8" />
          </button>
          <span className="text-[10px] font-medium text-primary mt-1">إعلان</span>
        </div>

        <NavItem href="/messages" icon={<MessageCircle className="w-6 h-6" />} label="الرسائل" isActive={location === "/messages"} />
        <NavItem href="/profile" icon={<User className="w-6 h-6" />} label="حسابي" isActive={location === "/profile" || location === "/stats" || location === "/login" || location === "/signup"} />
      </div>
    </nav>
  );
}

function NavItem({ href, icon, label, isActive }: { href: string; icon: React.ReactNode; label: string; isActive: boolean }) {
  return (
    <Link href={href} className="flex-1 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform">
      <div className={cn("transition-colors", isActive ? "text-primary" : "text-muted-foreground")}>
        {icon}
      </div>
      <span className={cn("text-[10px] font-medium transition-colors", isActive ? "text-primary" : "text-muted-foreground")}>
        {label}
      </span>
    </Link>
  );
}
