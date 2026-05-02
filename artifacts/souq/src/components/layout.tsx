import { Link, useLocation, useSearch } from "wouter";
import { Home, Heart, Plus, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/i18n";
import {
  useListFavoriteAds,
  getListFavoriteAdsQueryKey,
  useListConversations,
  getListConversationsQueryKey,
} from "@workspace/api-client-react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const isAdminPage = location.startsWith("/admin");

  return (
    <div className="w-full min-h-[100svh] bg-background">
      <div className="relative mx-auto w-full max-w-screen-2xl min-h-[100svh] overflow-x-hidden bg-background pb-[calc(64px+env(safe-area-inset-bottom,0px))] md:pb-[calc(72px+env(safe-area-inset-bottom,0px))]">
        {children}

        {!isAdminPage && <BottomNav />}
      </div>
    </div>
  );
}

function BottomNav() {
  const [location, navigate] = useLocation();
  const search = useSearch();
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  const { data: favoriteAds } = useListFavoriteAds({
    query: {
      queryKey: getListFavoriteAdsQueryKey(),
      enabled: isAuthenticated && !isLoading,
      retry: false,
    },
  });
  const favCount = Array.isArray(favoriteAds) ? favoriteAds.length : 0;

  const { data: conversations } = useListConversations({
    query: {
      queryKey: getListConversationsQueryKey(),
      enabled: isAuthenticated && !isLoading,
      retry: false,
    },
  });
  const unreadTotal = Array.isArray(conversations)
    ? conversations.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0)
    : 0;
  const showGuestToast = (nextTarget: string) => {
    const title = t("bottom_nav.login_required_title");
    const descriptionMap: Record<string, string> = {
      "/create-ad": t("bottom_nav.login_required_create"),
      "/messages": t("bottom_nav.login_required_messages"),
      "/favorites": t("bottom_nav.login_required_favorites"),
      "/profile": t("bottom_nav.login_required_profile"),
    };
    toast({
      title,
      description: descriptionMap[nextTarget] ?? t("bottom_nav.login_required_default"),
    });
  };
  const forceNavigate = (target: string) => {
    const before = `${window.location.pathname}${window.location.search}`;
    navigate(target);
    window.setTimeout(() => {
      const after = `${window.location.pathname}${window.location.search}`;
      if (after === before || after !== target) {
        window.history.pushState({}, "", target);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    }, 0);
  };
  const toGuestWelcome = (nextTarget: string) => {
    const target = `/guest-welcome?next=${encodeURIComponent(nextTarget)}&t=${Date.now()}`;
    forceNavigate(target);
  };
  const logNavTap = (key: "profile" | "messages" | "favorites" | "create", target: string) => {
    console.log("[bottom-nav]", {
      key,
      target,
      isAuthenticated,
      isLoading,
      location,
      href: `${window.location.pathname}${window.location.search}`,
    });
  };

  const handleCreateClick = () => {
    const nextTarget = "/create-ad";
    logNavTap("create", nextTarget);
    if (!isAuthenticated) {
      showGuestToast(nextTarget);
      toGuestWelcome(nextTarget);
      return;
    }

    forceNavigate("/new");
  };

  const handleProfileClick = () => {
    const nextTarget = "/profile";
    logNavTap("profile", nextTarget);
    if (!isAuthenticated) {
      showGuestToast(nextTarget);
      toGuestWelcome(nextTarget);
      return;
    }

    forceNavigate("/profile");
  };
  const handleMessagesClick = () => {
    const nextTarget = "/messages";
    logNavTap("messages", nextTarget);
    if (!isAuthenticated) {
      showGuestToast(nextTarget);
      toGuestWelcome(nextTarget);
      return;
    }
    forceNavigate("/messages");
  };
  const handleFavoritesClick = () => {
    const nextTarget = "/favorites";
    logNavTap("favorites", nextTarget);
    if (!isAuthenticated) {
      showGuestToast(nextTarget);
      toGuestWelcome(nextTarget);
      return;
    }
    forceNavigate("/favorites");
  };

  const searchParams = new URLSearchParams(search);
  const nextTarget = searchParams.get("next") || searchParams.get("redirect");

  const isMessagesActive =
    location.startsWith("/messages") || nextTarget === "/messages";

  const isProfileActive =
    location.startsWith("/profile") ||
    location === "/stats" ||
    location === "/signup" ||
    (location === "/guest-welcome" && nextTarget === "/profile") ||
    (location.startsWith("/login") && !search.includes("redirect=/messages"));

  const isFavoritesActive =
    location === "/favorites" ||
    (location === "/guest-welcome" && nextTarget === "/favorites");

  return (
    <nav className="pointer-events-none fixed bottom-0 left-0 right-0 z-40">
      <div className="pointer-events-auto w-full border-t border-primary/25 bg-[#0A0A0A]/92 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md shadow-[0_-1px_0_rgba(163,230,53,0.08),0_-8px_28px_-12px_rgba(0,0,0,0.6)]">
        <div
          className="relative mx-auto flex h-[72px] max-w-screen-2xl items-center justify-between px-2 md:h-[78px] md:px-4 lg:px-8"
          dir="rtl"
        >
        <NavItem
          href="/"
          icon={<Home className="h-5 w-5 md:h-6 md:w-6" />}
          label={t("bottom_nav.home")}
          isActive={location === "/"}
        />

        <button
          type="button"
          onClick={handleFavoritesClick}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 transition-[transform,color] duration-200 active:scale-95",
            isFavoritesActive ? "scale-[1.04] text-primary" : "text-zinc-400",
          )}
        >
          <div
            className={cn(
              "relative transition-colors",
              isFavoritesActive
                ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.32)]"
                : "text-zinc-400",
            )}
          >
            <Heart className="h-5 w-5 md:h-6 md:w-6" />
            {isAuthenticated && favCount > 0 && (
              <span
                dir="ltr"
                className="absolute -top-1.5 -end-1 flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full border-2 border-zinc-950 bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground tabular-nums shadow-[0_0_8px_-2px_hsl(var(--primary)/0.45)]"
              >
                {favCount > 99 ? "99+" : favCount}
              </span>
            )}
          </div>
          <span
            className={cn(
              "text-[10px] font-medium transition-colors md:text-xs",
              isFavoritesActive ? "text-primary" : "text-zinc-400",
            )}
          >
            {t("bottom_nav.favorites")}
          </span>
        </button>

        <div className="relative -top-4 flex flex-1 flex-col items-center justify-end md:-top-5">
          <button
            onClick={handleCreateClick}
            className="flex h-[58px] w-[58px] items-center justify-center rounded-full border-4 border-[#0A0A0A]/90 bg-primary text-[#0A0A0A] shadow-[0_10px_24px_-10px_hsl(var(--primary)/0.7),0_0_18px_-8px_hsl(var(--primary)/0.6)] transition-[transform,box-shadow] duration-200 hover:scale-[1.03] hover:shadow-[0_12px_28px_-10px_hsl(var(--primary)/0.85),0_0_22px_-6px_hsl(var(--primary)/0.75)] active:scale-[0.98] md:h-[64px] md:w-[64px]"
          >
            <Plus className="h-8 w-8 md:h-9 md:w-9" strokeWidth={2.8} />
          </button>
          <span className="mt-1 text-[10px] font-medium text-primary md:text-xs">
            {t("bottom_nav.post")}
          </span>
        </div>

        <button
          type="button"
          onClick={handleMessagesClick}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 transition-[transform,color] duration-200 active:scale-95",
            isMessagesActive ? "scale-[1.04] text-primary" : "text-zinc-400",
          )}
        >
          <div
            className={cn(
              "relative transition-colors",
              isMessagesActive
                ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.32)]"
                : "text-zinc-400",
            )}
          >
            <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
            {isAuthenticated && unreadTotal > 0 && (
              <span
                dir="ltr"
                className="absolute -top-1.5 -end-1 flex min-h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full border-2 border-zinc-950 bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground tabular-nums shadow-[0_0_8px_-2px_hsl(var(--primary)/0.45)]"
              >
                {unreadTotal > 99 ? "99+" : unreadTotal}
              </span>
            )}
          </div>
          <span
            className={cn(
              "text-[10px] font-medium transition-colors md:text-xs",
              isMessagesActive ? "text-primary" : "text-zinc-400",
            )}
          >
            {t("bottom_nav.messages")}
          </span>
        </button>

        <button
          type="button"
          onClick={handleProfileClick}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 transition-[transform,color] duration-200 active:scale-95",
            isProfileActive ? "scale-[1.04] text-primary" : "text-zinc-400",
          )}
        >
          <div
            className={cn(
              "transition-colors",
              isProfileActive
                ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.32)]"
                : "text-zinc-400",
            )}
          >
            <User className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <span
            className={cn(
              "text-[10px] font-medium transition-colors md:text-xs",
              isProfileActive ? "text-primary" : "text-zinc-400",
            )}
          >
            {t("bottom_nav.account")}
          </span>
        </button>
        </div>
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
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1 transition-[transform,color] duration-200 active:scale-95",
        isActive ? "scale-[1.04] text-primary" : "text-zinc-400",
      )}
    >
      <div
        className={cn(
          "transition-colors",
          isActive
            ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.32)]"
            : "text-zinc-400",
        )}
      >
        {icon}
      </div>
      <span
        className={cn(
          "text-[10px] font-medium transition-colors md:text-xs",
          isActive ? "text-primary" : "text-zinc-400",
        )}
      >
        {label}
      </span>
    </Link>
  );
}
