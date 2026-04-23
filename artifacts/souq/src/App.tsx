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
import Signup from "@/pages/signup";
import EditAd from "@/pages/edit-ad";
import Settings from "@/pages/settings";
import VerifyEmail from "@/pages/verify-email";

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
        <Route path="/signup" component={Signup} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/settings" component={Settings} />
        <Route path="/profile" component={Profile} />
        <Route path="/favorites" component={Favorites} />
        <Route path="/stats" component={Stats} />
        <Route path="/messages">
          <div className="flex flex-col items-center justify-center h-[70vh] p-4 text-center">
            <img src="/empty-state.png" alt="No messages" className="w-48 h-48 opacity-80 mb-4" />
            <h2 className="text-xl font-bold mb-2">لا توجد رسائل</h2>
            <p className="text-muted-foreground">ستظهر محادثاتك هنا قريباً.</p>
          </div>
        </Route>
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
