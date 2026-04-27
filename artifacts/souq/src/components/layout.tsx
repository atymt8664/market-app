import { Link, useLocation } from "wouter";
import { Home, Heart, PlusCircle, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const isAdminPage = location.startsWith("/admin");

  return (
    <div className="w-full min-h-screen bg-background">
      <div className="w-full max-w-screen-2xl min-h-[100dvh] mx-auto relative pb-[64px] md:pb-[72px] bg-background overflow-x-hidden">
        {children}

        {!isAdminPage && <BottomNav />}
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
      toast({
        title: "يرجى تسجيل الدخول أولاً",
        description: "يجب أن يكون لديك حساب لنشر إعلان",
      });
      navigate("/login?redirect=/new");
      return;
    }

    navigate("/new");
  };

  const search = window.location.search;

  const isMessagesActive =
    location.startsWith("/messages") || search.includes("redirect=/messages");

  const isProfileActive =
    location.startsWith("/profile") ||
    location === "/stats" ||
    location === "/signup" ||
    (location.startsWith("/login") && !search.includes("redirect=/messages"));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="w-full max-w-screen-2xl h-[64px] md:h-[72px] bg-card border-t border-border flex items-center justify-around lg:justify-evenly px-2 md:px-4 lg:px-10 pointer-events-auto relative">
        <NavItem
          href="/"
          icon={<Home className="w-6 h-6" />}
          label="بحث"
          isActive={location === "/"}
        />

        <NavItem
          href="/favorites"
          icon={<Heart className="w-6 h-6" />}
          label="المفضلة"
          isActive={location === "/favorites"}
        />

        <div className="flex-1 flex flex-col items-center justify-end relative -top-3 md:-top-4">
          <button
            onClick={handleCreateClick}
            className="w-14 h-14 md:w-15 md:h-15 lg:w-16 lg:h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:scale-95 active:scale-90 transition-transform duration-200 border-4 border-card"
          >
            <PlusCircle className="w-8 h-8 lg:w-9 lg:h-9" />
          </button>
          <span className="text-[10px] lg:text-xs font-medium text-primary mt-1">
            إعلان
          </span>
        </div>

        <NavItem
          href="/messages"
          icon={<MessageCircle className="w-6 h-6" />}
          label="الرسائل"
          isActive={isMessagesActive}
        />

        <NavItem
          href="/profile"
          icon={<User className="w-6 h-6" />}
          label="حسابي"
          isActive={isProfileActive}
        />
      </div>
    </nav>
  );
}

function NavItem({
  href,
  icon,
  label,
  isActive,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex-1 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
    >
      <div
        className={cn(
          "transition-colors",
          isActive ? "text-primary" : "text-muted-foreground",
        )}
      >
        {icon}
      </div>
      <span
        className={cn(
          "text-[10px] lg:text-xs font-medium transition-colors",
          isActive ? "text-primary" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </Link>
  );
}
