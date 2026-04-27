import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Categories from "@/pages/categories";
import Category from "@/pages/category";
import Search from "@/pages/search";
import AdDetail from "@/pages/ad-detail";
import CreateAd from "@/pages/create-ad";
import Profile from "@/pages/profile";
import Favorites from "@/pages/favorites";
import Stats from "@/pages/stats";
import Login from "@/pages/login";
import AdminLogin from "@/pages/admin-login";
import Signup from "@/pages/signup";
import AdminPage from "./pages/admin";
import AdminAdsPage from "@/pages/admin-ads";
import AdminReportsPage from "@/pages/admin-reports";
import AdminSupportPage from "@/pages/admin-support";
import AdminUsersPage from "@/pages/admin-users";
import AdminUserDetailsPage from "@/pages/admin-user-details";
import AdminStatsPage from "@/pages/admin-stats";
import AdminCitiesPage from "@/pages/admin-cities";
import AdminCategoriesPage from "@/pages/admin-categories";
import AdminLogsPage from "@/pages/admin-logs";
import AdminSettingsPage from "@/pages/admin-settings";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import UserProfile from "@/pages/user-profile";
import EditAd from "@/pages/edit-ad";
import Settings from "@/pages/settings";
import VerifyEmail from "@/pages/verify-email";
import AccountProfile from "@/pages/account-profile";
import AccountEmail from "@/pages/account-email";
import AccountPassword from "@/pages/account-password";
import AccountInfo from "@/pages/account-info";
import Messages from "@/pages/messages";
import MessageThread from "@/pages/message-thread";
import SupportHelpPage from "@/pages/support-help";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/categories" component={Categories} />
        <Route path="/category/:id" component={Category} />
        <Route path="/search" component={Search} />
        <Route path="/ad/:id" component={AdDetail} />
        <Route path="/new">{() => <CreateAd />}</Route>
        <Route path="/edit/:id" component={EditAd} />
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
        <Route path="/admin/settings" component={AdminSettingsPage} />
        <Route path="/signup" component={Signup} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/users/:id" component={UserProfile} />
        <Route path="/settings" component={Settings} />
        <Route path="/account/profile" component={AccountProfile} />
        <Route path="/account/email" component={AccountEmail} />
        <Route path="/account/password" component={AccountPassword} />
        <Route path="/account/help" component={SupportHelpPage} />
        <Route path="/account/:slug" component={AccountInfo} />
        <Route path="/profile" component={Profile} />
        <Route path="/favorites" component={Favorites} />
        <Route path="/stats" component={Stats} />
        <Route path="/messages" component={Messages} />
        <Route path="/messages/:id" component={MessageThread} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
