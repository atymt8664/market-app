import { Link, useLocation, useSearch } from "wouter";
import { Home, Heart, PlusCircle, MessageCircle, User } from "lucide-react";
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="w-full max-w-screen-2xl h-[64px] md:h-[72px] bg-card border-t border-border flex items-center justify-around lg:justify-evenly px-2 md:px-4 lg:px-10 pointer-events-auto relative">
        <NavItem
          href="/"
          icon={<Home className="w-6 h-6" />}
          label={t("bottom_nav.home")}
          isActive={location === "/"}
        />

        <button
          type="button"
          onClick={handleFavoritesClick}
          className="flex-1 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
        >
          <div
            className={cn(
              "relative transition-colors",
              isFavoritesActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Heart className="w-6 h-6" />
            {isAuthenticated && favCount > 0 && (
              <span
                dir="ltr"
                className="absolute -top-1.5 -end-1 min-h-[1.125rem] min-w-[1.125rem] rounded-full border-2 border-card bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground flex items-center justify-center tabular-nums"
              >
                {favCount > 99 ? "99+" : favCount}
              </span>
            )}
          </div>
          <span
            className={cn(
              "text-[10px] lg:text-xs font-medium transition-colors",
              isFavoritesActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            {t("bottom_nav.favorites")}
          </span>
        </button>

        <div className="flex-1 flex flex-col items-center justify-end relative -top-3 md:-top-4">
          <button
            onClick={handleCreateClick}
            className="w-14 h-14 md:w-15 md:h-15 lg:w-16 lg:h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:scale-95 active:scale-90 transition-transform duration-200 border-4 border-card"
          >
            <PlusCircle className="w-8 h-8 lg:w-9 lg:h-9" />
          </button>
          <span className="text-[10px] lg:text-xs font-medium text-primary mt-1">
            {t("bottom_nav.post")}
          </span>
        </div>

        <button
          type="button"
          onClick={handleMessagesClick}
          className="flex-1 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
        >
          <div
            className={cn(
              "relative transition-colors",
              isMessagesActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <MessageCircle className="w-6 h-6" />
            {isAuthenticated && unreadTotal > 0 && (
              <span
                dir="ltr"
                className="absolute -top-1.5 -end-1 min-h-[1.125rem] min-w-[1.125rem] rounded-full border-2 border-card bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground flex items-center justify-center tabular-nums"
              >
                {unreadTotal > 99 ? "99+" : unreadTotal}
              </span>
            )}
          </div>
          <span
            className={cn(
              "text-[10px] lg:text-xs font-medium transition-colors",
              isMessagesActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            {t("bottom_nav.messages")}
          </span>
        </button>

        <button
          type="button"
          onClick={handleProfileClick}
          className="flex-1 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
        >
          <div
            className={cn(
              "transition-colors",
              isProfileActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <User className="w-6 h-6" />
          </div>
          <span
            className={cn(
              "text-[10px] lg:text-xs font-medium transition-colors",
              isProfileActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            {t("bottom_nav.account")}
          </span>
        </button>
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
