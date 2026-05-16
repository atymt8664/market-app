import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import { RouteLoadingFallback } from "@/components/route-loading-fallback";
import { RouteScrollRestoration } from "@/components/route-scroll-restoration";
import { hasSavedLocale, t, type Locale } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import {
  AUTH_ACCENT_OUTLINE_BTN,
  AUTH_CARD,
  AUTH_PAGE_BG,
  AUTH_SELECT_ROW,
} from "@/lib/auth-page-styles";
import { cn } from "@/lib/utils";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import { ChatSocketProvider } from "@/contexts/chat-socket-context";

const Categories = lazy(() => import("@/pages/categories"));
const Category = lazy(() => import("@/pages/category"));
const Search = lazy(() => import("@/pages/search"));
const AdDetail = lazy(() => import("@/pages/ad-detail"));
const CreateAd = lazy(() => import("@/pages/create-ad"));
const Profile = lazy(() => import("@/pages/profile"));
const Favorites = lazy(() => import("@/pages/favorites"));
const Stats = lazy(() => import("@/pages/stats"));
const PromoteAd = lazy(() => import("@/pages/promote-ad"));
const PromotePreviewPage = lazy(() => import("@/pages/promote-preview"));
const ProfessionalSellerPage = lazy(() => import("@/pages/professional-seller"));
const SellerTrustPage = lazy(() => import("@/pages/seller-trust"));
const AdminLogin = lazy(() => import("@/pages/admin-login"));
const AdminPage = lazy(() => import("@/pages/admin"));
const AdminAdsPage = lazy(() => import("@/pages/admin-ads"));
const AdminReportsPage = lazy(() => import("@/pages/admin-reports"));
const AdminSupportPage = lazy(() => import("@/pages/admin-support"));
const AdminUsersPage = lazy(() => import("@/pages/admin-users"));
const AdminUserDetailsPage = lazy(() => import("@/pages/admin-user-details"));
const AdminStatsPage = lazy(() => import("@/pages/admin-stats"));
const AdminCitiesPage = lazy(() => import("@/pages/admin-cities"));
const AdminCategoriesPage = lazy(() => import("@/pages/admin-categories"));
const AdminLogsPage = lazy(() => import("@/pages/admin-logs"));
const AdminBillingPage = lazy(() => import("@/pages/admin-billing"));
const AdminVerificationPage = lazy(() => import("@/pages/admin-verification"));
const AdminPlansPage = lazy(() => import("@/pages/admin-plans"));
const AdminSettingsPage = lazy(() => import("@/pages/admin-settings"));
const ForgotPassword = lazy(() => import("@/pages/forgot-password"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const UserProfile = lazy(() => import("@/pages/user-profile"));
const EditAd = lazy(() => import("@/pages/edit-ad"));
const Settings = lazy(() => import("@/pages/settings"));
const VerifyEmail = lazy(() => import("@/pages/verify-email"));
const TermsPage = lazy(() => import("@/pages/terms"));
const PrivacyPage = lazy(() => import("@/pages/privacy"));
const DeleteAccountPage = lazy(() => import("@/pages/delete-account"));
const AccountProfile = lazy(() => import("@/pages/account-profile"));
const AccountEmail = lazy(() => import("@/pages/account-email"));
const AccountPassword = lazy(() => import("@/pages/account-password"));
const AccountVerification = lazy(() => import("@/pages/account-verification"));
const AccountNotifications = lazy(() => import("@/pages/account-notifications"));
const AccountInfo = lazy(() => import("@/pages/account-info"));
const Messages = lazy(() => import("@/pages/messages"));
const MessageThread = lazy(() => import("@/pages/message-thread"));
const SupportHelpPage = lazy(() => import("@/pages/support-help"));
const NotificationsPage = lazy(() => import("@/pages/notifications"));
const Login = lazy(() => import("@/pages/login"));
const Signup = lazy(() => import("@/pages/signup"));
const GuestWelcome = lazy(() => import("@/pages/guest-welcome"));

function Router() {
  return (
    <Layout>
      <ChatSocketProvider>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Switch>
          <Route path="/" component={Home} />
          <Route path="/categories" component={Categories} />
          <Route path="/category/:id" component={Category} />
          <Route path="/search" component={Search} />
          <Route path="/ad/:id" component={AdDetail} />
          <Route path="/new">{() => <CreateAd />}</Route>
          <Route path="/create-ad">{() => <Redirect to="/new" />}</Route>
          <Route path="/edit/:id" component={EditAd} />
          <Route path="/edit-ad/:id">{({ id }) => <Redirect to={`/edit/${id}`} />}</Route>
          <Route path="/login" component={Login} />
          <Route path="/admin-login" component={AdminLogin} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/admin/ads" component={AdminAdsPage} />
          <Route path="/admin/reports" component={AdminReportsPage} />
          <Route path="/admin/support" component={AdminSupportPage} />
          <Route path="/admin/users" component={AdminUsersPage} />
          <Route path="/admin/users/:id" component={AdminUserDetailsPage} />
          <Route path="/admin/stats" component={AdminStatsPage} />
          <Route path="/admin/cities" component={AdminCitiesPage} />
          <Route path="/admin/categories" component={AdminCategoriesPage} />
          <Route path="/admin/logs" component={AdminLogsPage} />
          <Route path="/admin/billing" component={AdminBillingPage} />
          <Route path="/admin/verification" component={AdminVerificationPage} />
          <Route path="/admin/plans" component={AdminPlansPage} />
          <Route path="/admin/settings" component={AdminSettingsPage} />
          <Route path="/signup" component={Signup} />
          <Route path="/verify-email" component={VerifyEmail} />
          <Route path="/terms" component={TermsPage} />
          <Route path="/privacy" component={PrivacyPage} />
          <Route path="/delete-account" component={DeleteAccountPage} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/guest-welcome" component={GuestWelcome} />
          <Route path="/users/:id" component={UserProfile} />
          <Route path="/settings" component={Settings} />
          <Route path="/account/profile" component={AccountProfile} />
          <Route path="/account/email" component={AccountEmail} />
          <Route path="/account/password" component={AccountPassword} />
          <Route path="/account/verification" component={AccountVerification} />
          <Route path="/account/notifications" component={AccountNotifications} />
          <Route path="/account/help" component={SupportHelpPage} />
          <Route path="/support">{() => <Redirect to="/account/help" />}</Route>
          <Route path="/support/help">{() => <Redirect to="/account/help" />}</Route>
          <Route path="/notifications" component={NotificationsPage} />
          <Route path="/account/:slug" component={AccountInfo} />
          <Route path="/promote-preview" component={PromotePreviewPage} />
          <Route path="/promote/:id" component={PromoteAd} />
          <Route path="/professional-seller/:segment" component={ProfessionalSellerPage} />
          <Route path="/professional-seller">{() => <Redirect to="/professional-seller/personal" />}</Route>
          <Route path="/seller-trust" component={SellerTrustPage} />
          <Route path="/profile" component={Profile} />
          <Route path="/favorites" component={Favorites} />
          <Route path="/stats" component={Stats} />
          <Route path="/messages" component={Messages} />
          <Route path="/messages/:id" component={MessageThread} />
          <Route component={NotFound} />
          </Switch>
        </Suspense>
      </ChatSocketProvider>
    </Layout>
  );
}

function detectDeviceLocale(): Locale {
  if (typeof navigator === "undefined") return "ar";
  const raw = navigator.language.toLowerCase();
  if (raw.startsWith("ar")) return "ar";
  if (raw.startsWith("en")) return "en";
  if (raw.startsWith("de")) return "de";
  return "ar";
}

function FirstLaunchLanguageGate({ onDone }: { onDone: () => void }) {
  const { setLocale } = useLocale();
  const [selectedLocale, setSelectedLocale] = useState<Locale>(() => detectDeviceLocale());
  const options: Array<{ code: Locale; label: string }> = [
    { code: "ar", label: t("language.option.ar") },
    { code: "en", label: t("language.option.en") },
    { code: "de", label: t("language.option.de") },
  ];

  return (
    <div className={cn(AUTH_PAGE_BG, "items-center justify-center px-4 py-10")}>
      <div className={cn(AUTH_CARD, "w-full max-w-md")}>
        <h1 className="text-lg font-bold text-foreground">{t("first_launch.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("first_launch.subtitle")}</p>
        <div className="mt-4 space-y-1.5">
          {options.map((option) => (
            <button
              key={option.code}
              type="button"
              onClick={() => setSelectedLocale(option.code)}
              className={cn(
                AUTH_SELECT_ROW,
                "py-3 text-start font-medium",
                option.code === selectedLocale && "border-primary/40 bg-zinc-900/90 shadow-[0_0_14px_-10px_hsl(var(--primary)/0.25)]",
              )}
            >
              <span className="inline-flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <span className="truncate">{option.label}</span>
                {option.code === "ar" ? (
                  <span className="shrink-0 rounded-full border border-primary/35 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {t("first_launch.recommended")}
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setLocale(selectedLocale);
            onDone();
          }}
          className={cn(AUTH_ACCENT_OUTLINE_BTN, "mt-5 text-sm hover:bg-zinc-900")}
        >
          {t("first_launch.confirm")}
        </button>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{t("first_launch.note")}</p>
      </div>
    </div>
  );
}

/**
 * Public Google Play Data Safety landing page. Must render even on a brand-new
 * visit (no saved locale yet), before the first-launch language gate, so external
 * reviewers / search crawlers see the deletion instructions immediately.
 */
function isPublicDataSafetyPath(pathname: string): boolean {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const stripped = base && pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  return stripped === "/delete-account";
}

function App() {
  const [showFirstLaunchSelector, setShowFirstLaunchSelector] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && isPublicDataSafetyPath(window.location.pathname)) {
      setShowFirstLaunchSelector(false);
      return;
    }
    setShowFirstLaunchSelector(!hasSavedLocale());
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {showFirstLaunchSelector ? (
          <FirstLaunchLanguageGate onDone={() => setShowFirstLaunchSelector(false)} />
        ) : (
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <RouteScrollRestoration />
            <Router />
          </WouterRouter>
        )}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
