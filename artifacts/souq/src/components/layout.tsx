import { memo } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useSearch } from "wouter";
import { Home, Heart, Plus, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/i18n";
import { useListFavoriteAds } from "@workspace/api-client-react";
import { scrollPopstateGuard } from "@/components/scroll-restoration-guard";
import { useAfterFirstPaint } from "@/lib/after-first-paint";
import { STALE_USER_ADS_MS } from "@/lib/query-stale-times";
import { favoritesListQueryKey } from "@/lib/invalidate-ad-queries";
import { NotificationPermissionPrompt } from "@/components/notification-permission-prompt";
import { PushForegroundBanner } from "@/components/push-foreground-banner";
import { PushNotificationsRegistrar } from "@/components/push-notifications-registrar";
import { ChatSocketProvider } from "@/contexts/chat-socket-context";
import { AppBadgeSync } from "@/components/app-badge-sync";
import { AppCountersRealtimeSync } from "@/components/app-counters-realtime-sync";
import { useMessagesUnreadCount } from "@/hooks/use-unread-counters";
import { formatBadgeCount } from "@/lib/app-badge-counters";
import { MESSAGES_UNREAD_BADGE_CLASS, UNREAD_COUNTER_BADGE_CLASS } from "@/lib/messages-badge-styles";
import { AppShell } from "@/components/app-shell";
import { AppChromeHeaderBridge } from "@/components/app-chrome-header-bridge";
import { AppChromeProvider } from "@/contexts/app-chrome-context";
import {
  BOTTOM_NAV_CHROME_PANEL_CLASS,
  BOTTOM_NAV_FIXED_SHELL_CLASS,
  BOTTOM_NAV_BUTTONS_ROW_CLASS,
  bottomNavChromeDomProps,
} from "@/lib/bottom-nav-layout";
import { APP_SHELL_LAYER, APP_SHELL_LAYER_MARKER } from "@/lib/app-shell-layout";

interface LayoutProps {
  children: React.ReactNode;
}

/** إعدادات / حساب / قانوني / دعم — نفس وضع الإشعارات: بدون شريط سفلي وبدون حجز ارتفاعه */
function isImmersiveSettingsLegalAccountRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/settings") ||
    pathname.startsWith("/account/") ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/delete-account" ||
    pathname === "/verify-email" ||
    pathname.startsWith("/support")
  );
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const isAdminPage = location.startsWith("/admin");
  /** محادثة `/messages/:id` — fullscreen مثل واتساب: لا BottomNav ولا padding سفلي للشريط */
  const isMessageThreadRoute = /^\/messages\/\d+/.test(location);
  const isNotificationsRoute = location.startsWith("/notifications");
  /** مسارات تسويق غامرة: بدون BottomNav */
  const isImmersiveMarketingRoute =
    location.startsWith("/promote/") ||
    location === "/promote-preview" ||
    location.startsWith("/professional-seller") ||
    location.startsWith("/seller-trust");
  const isDevMockRoute = location.startsWith("/dev/");
  /** P17-5 — checkout / order confirmation: full-height flow without BottomNav overlap */
  const isP17CheckoutFlowRoute =
    location.startsWith("/checkout/") || location === "/orders/created";
  const isImmersiveShell =
    isMessageThreadRoute || isNotificationsRoute || isImmersiveSettingsLegalAccountRoute(location);
  const hideBottomNav =
    location.startsWith("/reset-password") ||
    location.startsWith("/login") ||
    location.startsWith("/signup") ||
    location.startsWith("/forgot-password") ||
    location.startsWith("/admin-login") ||
    isDevMockRoute ||
    isImmersiveShell ||
    isImmersiveMarketingRoute ||
    isP17CheckoutFlowRoute;

  const afterFirstPaint = useAfterFirstPaint();
  const { isAuthenticated, isLoading } = useAuth({
    queryEnabled: afterFirstPaint,
  });
  const realtimeEnabled = afterFirstPaint && isAuthenticated && !isLoading;

  const showBottomNav = !isAdminPage && !hideBottomNav;

  return (
    <ChatSocketProvider enabled={realtimeEnabled}>
      {realtimeEnabled ? (
        <>
          <AppCountersRealtimeSync />
          <AppBadgeSync />
        </>
      ) : null}
    <AppChromeProvider>
    <AppShell header={<AppChromeHeaderBridge />}>
      {afterFirstPaint ? (
        <>
          <PushNotificationsRegistrar />
          <NotificationPermissionPrompt />
          <PushForegroundBanner />
        </>
      ) : null}
      {/*
        P9-3 App Shell L2 — route outlet. L3 BottomNav via portal on body (containing-block safe).
        L0 locks document scroll; L2 data-app-shell-scroll is the sole vertical scroll owner.
      */}
      {children}
    </AppShell>
    </AppChromeProvider>
      {showBottomNav && typeof document !== "undefined"
        ? createPortal(<BottomNav />, document.body)
        : null}
    </ChatSocketProvider>
  );
}

const BottomNav = memo(function BottomNav() {
  const [location, navigate] = useLocation();
  const search = useSearch();

  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const secondaryQueriesReady = useAfterFirstPaint();

  const { data: favoriteAds } = useListFavoriteAds({
    query: {
      queryKey: favoritesListQueryKey(),
      enabled: isAuthenticated && !isLoading && secondaryQueriesReady,
      staleTime: STALE_USER_ADS_MS,
      retry: false,
    },
  });
  const favCount = Array.isArray(favoriteAds) ? favoriteAds.length : 0;

  const messagesUnread = useMessagesUnreadCount({
    enabled: isAuthenticated && !isLoading && secondaryQueriesReady,
  });
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
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console -- BottomNav tap diagnostics (dev only)
      console.log("[bottom-nav]", {
        key,
        target,
        isAuthenticated,
        isLoading,
        location,
        href: `${window.location.pathname}${window.location.search}`,
      });
    }
  };

  const handleCreateClick = () => {
    const nextTarget = "/create-ad";
    logNavTap("create", nextTarget);
    if (!isLoading && !isAuthenticated) {
      showGuestToast(nextTarget);
      toGuestWelcome(nextTarget);
      return;
    }

    forceNavigate("/new");
  };

  const handleProfileClick = () => {
    const nextTarget = "/profile";
    logNavTap("profile", nextTarget);
    if (!isLoading && !isAuthenticated) {
      showGuestToast(nextTarget);
      toGuestWelcome(nextTarget);
      return;
    }

    forceNavigate("/profile");
  };
  const handleMessagesClick = () => {
    const nextTarget = "/messages";
    logNavTap("messages", nextTarget);
    if (!isLoading && !isAuthenticated) {
      showGuestToast(nextTarget);
      toGuestWelcome(nextTarget);
      return;
    }
    forceNavigate("/messages");
  };
  const handleFavoritesClick = () => {
    const nextTarget = "/favorites";
    logNavTap("favorites", nextTarget);
    if (!isLoading && !isAuthenticated) {
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
    <nav
      className={BOTTOM_NAV_FIXED_SHELL_CLASS}
      data-bottom-nav-shell
      {...{ [APP_SHELL_LAYER_MARKER]: APP_SHELL_LAYER.L3_BOTTOM_NAV }}
    >
      <div className={BOTTOM_NAV_CHROME_PANEL_CLASS} {...bottomNavChromeDomProps()}>
        <div
          className={BOTTOM_NAV_BUTTONS_ROW_CLASS}
          dir="rtl"
          data-bottom-nav-buttons
        >
          <NavItem
            href="/"
            icon={<Home className="h-[1.125rem] w-[1.125rem] md:h-5 md:w-5" />}
            label={t("bottom_nav.home")}
            isActive={location === "/"}
          />

          <button type="button" onClick={handleFavoritesClick} className="flex min-w-0 flex-1">
            <BottomNavSlot isActive={isFavoritesActive}>
              <div className="relative">
                <Heart className="h-[1.125rem] w-[1.125rem] md:h-5 md:w-5" />
                {isAuthenticated && favCount > 0 && (
                  <span dir="ltr" className={cn("absolute -top-1.5 -end-1", UNREAD_COUNTER_BADGE_CLASS)}>
                    {favCount > 99 ? "99+" : favCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium md:text-xs">{t("bottom_nav.favorites")}</span>
            </BottomNavSlot>
          </button>

          <button type="button" onClick={handleCreateClick} className="flex min-w-0 flex-1">
            <BottomNavSlot isActive={isCreateActive} promote>
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/50 bg-[#0A0A0A]/90 text-primary shadow-[0_0_12px_-10px_hsl(var(--primary)/0.26)] ring-1 ring-primary/22 md:h-8 md:w-8 md:shadow-[0_0_16px_-10px_hsl(var(--primary)/0.38)] md:ring-primary/25">
                <Plus className="h-4 w-4 md:h-[1.125rem] md:w-[1.125rem]" strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-medium md:text-xs">{t("bottom_nav.post")}</span>
            </BottomNavSlot>
          </button>

          <button type="button" onClick={handleMessagesClick} className="flex min-w-0 flex-1">
            <BottomNavSlot isActive={isMessagesActive}>
              <div className="relative">
                <MessageCircle className="h-[1.125rem] w-[1.125rem] md:h-5 md:w-5" />
                {isAuthenticated && messagesUnread > 0 && (
                  <span dir="ltr" className={cn("absolute -top-1.5 -end-1", MESSAGES_UNREAD_BADGE_CLASS)}>
                    {formatBadgeCount(messagesUnread)}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium md:text-xs">{t("bottom_nav.messages")}</span>
            </BottomNavSlot>
          </button>

          <button type="button" onClick={handleProfileClick} className="flex min-w-0 flex-1">
            <BottomNavSlot isActive={isProfileActive}>
              <User className="h-[1.125rem] w-[1.125rem] md:h-5 md:w-5" />
              <span className="text-[10px] font-medium md:text-xs">{t("bottom_nav.account")}</span>
            </BottomNavSlot>
          </button>
        </div>
      </div>
    </nav>
  );
});

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
        "flex h-full min-h-[44px] w-full flex-col items-center justify-center gap-0.5 rounded-xl border px-0.5 py-0.5 md:min-h-[48px] md:px-1 md:py-1",
        /* انتقالات أخف: ألوان/حدود فقط على الموبايل لتقليل repaints */
        "transition-[color,background-color,border-color,box-shadow] duration-150 ease-out md:duration-200",
        isActive
          ? cn(
              "border-primary/55 bg-[#0A0A0A]/95 text-primary ring-1 ring-primary/32 [&_svg]:text-primary [&_span]:font-semibold [&_span]:text-primary",
              "shadow-[0_0_18px_-12px_hsl(var(--primary)/0.32)] md:border-primary/58 md:shadow-[0_0_30px_-10px_hsl(var(--primary)/0.48)] md:ring-primary/38",
            )
          : cn(
              "border-primary/30 bg-[#0A0A0A]/82 ring-1 ring-primary/14 shadow-[0_0_14px_-14px_hsl(var(--primary)/0.12)] hover:border-primary/42 hover:bg-black/90 md:shadow-[0_0_22px_-14px_hsl(var(--primary)/0.16)] md:ring-primary/16 md:hover:border-primary/45 md:hover:shadow-[0_0_26px_-12px_hsl(var(--primary)/0.28)]",
              "[&_svg]:text-primary/58 [&_span]:text-primary/52",
              "md:active:scale-[0.98]",
              promote &&
                "border-primary/42 bg-[#0A0A0A]/88 ring-primary/22 [&_svg]:text-primary/85 [&_span]:text-primary/72",
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
