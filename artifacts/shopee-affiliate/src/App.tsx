import type * as React from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getAdminToken } from "@/hooks/use-admin";
import { Redirect } from "wouter";
import Home from "@/pages/Home";
import ProductDetail from "@/pages/ProductDetail";
import SearchPage from "@/pages/SearchPage";
import GeneratePage from "@/pages/GeneratePage";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminProducts from "@/pages/AdminProducts";
import AdminSettings from "@/pages/AdminSettings";
import AboutPage from "@/pages/AboutPage";
import SitemapPage from "@/pages/SitemapPage";
import WishlistPage from "@/pages/WishlistPage";
import ComparePage from "@/pages/ComparePage";
import TrendingPage from "@/pages/TrendingPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function AdminGuard({ component: Component }: { component: () => React.ReactElement }) {
  const token = getAdminToken();
  if (!token) return <Redirect to="/admin" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/product/:slug" component={ProductDetail} />
      <Route path="/search" component={SearchPage} />
      <Route path="/generate" component={GeneratePage} />
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/dashboard">
        {() => <AdminGuard component={AdminDashboard} />}
      </Route>
      <Route path="/admin/products">
        {() => <AdminGuard component={AdminProducts} />}
      </Route>
      <Route path="/admin/settings">
        {() => <AdminGuard component={AdminSettings} />}
      </Route>
      <Route path="/about" component={AboutPage} />
      <Route path="/sitemap" component={SitemapPage} />
      <Route path="/wishlist" component={WishlistPage} />
      <Route path="/compare" component={ComparePage} />
      <Route path="/trending" component={TrendingPage} />
      <Route component={NotFound} />
    </Switch>
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
