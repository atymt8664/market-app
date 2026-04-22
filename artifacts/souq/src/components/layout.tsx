import { Link, useLocation } from "wouter";
import { Home, Heart, PlusCircle, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="w-full max-w-[480px] h-[64px] bg-card border-t border-border flex items-center justify-around px-2 pointer-events-auto relative">
        <NavItem href="/" icon={<Home className="w-6 h-6" />} label="بحث" isActive={location === "/"} />
        <NavItem href="/favorites" icon={<Heart className="w-6 h-6" />} label="المفضلة" isActive={location === "/favorites"} />
        
        {/* Floating Action Button for Create Ad */}
        <div className="relative -top-5">
          <Link href="/new">
            <button className="w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:scale-95 active:scale-90 transition-transform duration-200 border-4 border-card">
              <PlusCircle className="w-8 h-8" />
            </button>
          </Link>
        </div>

        <NavItem href="/messages" icon={<MessageCircle className="w-6 h-6" />} label="الرسائل" isActive={location === "/messages"} />
        <NavItem href="/profile" icon={<User className="w-6 h-6" />} label="إعلاناتي" isActive={location === "/profile" || location === "/stats"} />
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
