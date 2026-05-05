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
import { scrollPopstateGuard } from "@/components/scroll-restoration-guard";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const isAdminPage = location.startsWith("/admin");
  /** محادثة `/messages/:id` — fullscreen مثل واتساب: لا BottomNav ولا padding سفلي للشريط */
  const isMessageThreadRoute = /^\/messages\/\d+/.test(location);
  const hideBottomNav =
    location.startsWith("/reset-password") ||
    location.startsWith("/login") ||
    location.startsWith("/signup") ||
    location.startsWith("/forgot-password") ||
    isMessageThreadRoute;

  return (
    <div className="w-full min-h-[100svh] bg-[#0A0A0A]">
      {/*
        لا نفرض overflow:hidden على html/body من هنا — ذلك يمنع pull-to-refresh.
        تمرير الشات محصور في [data-chat-scroll] (انظر index.css).
      */}
      <div
        className={cn(
          "relative mx-auto w-full max-w-screen-2xl min-h-[100svh] overflow-x-hidden bg-[#0A0A0A]",
          isMessageThreadRoute
            ? "pb-0"
            : "pb-[calc(64px+env(safe-area-inset-bottom,0px))] md:pb-[calc(72px+env(safe-area-inset-bottom,0px))]",
        )}
      >
        {children}

        {!isAdminPage && !hideBottomNav && <BottomNav />}
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
      variant: "authAlert",
    });
  };
  const forceNavigate = (target: string) => {
    const before = `${window.location.pathname}${window.location.search}`;
    navigate(target);
    window.setTimeout(() => {
      const after = `${window.location.pathname}${window.location.search}`;
      if (after === before || after !== target) {
        window.history.pushState({}, "", target);
        scrollPopstateGuard.skipNext = true;
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

  const isCreateActive =
    location.startsWith("/new") || location.startsWith("/create-ad");

  return (
    <nav className="pointer-events-none fixed bottom-0 left-0 right-0 z-40">
      <div className="pointer-events-auto w-full border-t border-primary/25 bg-[#0A0A0A]/94 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md shadow-[0_-1px_0_rgba(163,230,53,0.08),0_-12px_36px_-16px_rgba(0,0,0,0.65)]">
        <div
          className="relative mx-auto flex max-w-screen-2xl items-stretch gap-1.5 px-2 py-2 md:gap-2 md:px-4 md:py-2.5 lg:px-8"
          dir="rtl"
        >
          <NavItem
            href="/"
            icon={<Home className="h-5 w-5 md:h-6 md:w-6" />}
            label={t("bottom_nav.home")}
            isActive={location === "/"}
          />

          <button type="button" onClick={handleFavoritesClick} className="flex min-w-0 flex-1">
            <BottomNavSlot isActive={isFavoritesActive}>
              <div className="relative">
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
              <span className="text-[10px] font-medium md:text-xs">{t("bottom_nav.favorites")}</span>
            </BottomNavSlot>
          </button>

          <button type="button" onClick={handleCreateClick} className="flex min-w-0 flex-1">
            <BottomNavSlot isActive={isCreateActive} promote>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/50 bg-zinc-950/90 text-primary shadow-[0_0_16px_-10px_hsl(var(--primary)/0.38)] ring-1 ring-primary/25 md:h-10 md:w-10">
                <Plus className="h-5 w-5 md:h-6 md:w-6" strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-medium md:text-xs">{t("bottom_nav.post")}</span>
            </BottomNavSlot>
          </button>

          <button type="button" onClick={handleMessagesClick} className="flex min-w-0 flex-1">
            <BottomNavSlot isActive={isMessagesActive}>
              <div className="relative">
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
              <span className="text-[10px] font-medium md:text-xs">{t("bottom_nav.messages")}</span>
            </BottomNavSlot>
          </button>

          <button type="button" onClick={handleProfileClick} className="flex min-w-0 flex-1">
            <BottomNavSlot isActive={isProfileActive}>
              <User className="h-5 w-5 md:h-6 md:w-6" />
              <span className="text-[10px] font-medium md:text-xs">{t("bottom_nav.account")}</span>
            </BottomNavSlot>
          </button>
        </div>
      </div>
    </nav>
  );
}

function BottomNavSlot({
  isActive,
  promote,
  children,
}: {
  isActive: boolean;
  /** Slightly stronger card + lime icons when inactive (مركز نشر) */
  promote?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[52px] w-full flex-col items-center justify-center gap-1 rounded-xl border px-1 py-1.5 transition-all duration-200 md:min-h-[56px] md:py-2",
        isActive
          ? "border-primary/58 bg-zinc-900/95 text-primary shadow-[0_0_30px_-10px_hsl(var(--primary)/0.48)] ring-1 ring-primary/38 [&_svg]:text-primary [&_span]:font-semibold [&_span]:text-primary"
          : cn(
              "border-primary/30 bg-zinc-950/82 shadow-[0_0_22px_-14px_hsl(var(--primary)/0.16)] ring-1 ring-primary/16 hover:border-primary/45 hover:bg-zinc-900/92 hover:shadow-[0_0_26px_-12px_hsl(var(--primary)/0.28)] active:scale-[0.98]",
              "[&_svg]:text-primary/58 [&_span]:text-primary/52",
              promote &&
                "border-primary/42 bg-zinc-950/88 ring-primary/22 [&_svg]:text-primary/85 [&_span]:text-primary/72",
            ),
      )}
    >
      {children}
    </div>
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
    <Link href={href} className="flex min-w-0 flex-1">
      <BottomNavSlot isActive={isActive}>
        {icon}
        <span className="text-[10px] font-medium md:text-xs">{label}</span>
      </BottomNavSlot>
    </Link>
  );
}
