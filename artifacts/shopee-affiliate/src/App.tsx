import { lazy, Suspense, type ComponentType } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getAdminToken } from "@/hooks/use-admin";
import { Redirect } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

const Home = lazy(() => import("@/pages/Home"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const GeneratePage = lazy(() => import("@/pages/GeneratePage"));
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminProducts = lazy(() => import("@/pages/AdminProducts"));
const AdminSettings = lazy(() => import("@/pages/AdminSettings"));
const AdminSeoAudit = lazy(() => import("@/pages/AdminSeoAudit"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const SitemapPage = lazy(() => import("@/pages/SitemapPage"));
const ComparePage = lazy(() => import("@/pages/ComparePage"));
const TrendingPage = lazy(() => import("@/pages/TrendingPage"));
const BestOfIndex = lazy(() => import("@/pages/BestOfIndex"));
const BestOfDetail = lazy(() => import("@/pages/BestOfDetail"));
const PriceDrops = lazy(() => import("@/pages/PriceDrops"));
const VsPage = lazy(() => import("@/pages/VsPage"));
const BrandIndex = lazy(() => import("@/pages/BrandIndex"));
const BrandDetail = lazy(() => import("@/pages/BrandDetail"));
const KoleksiIndex = lazy(() => import("@/pages/KoleksiIndex"));
const KoleksiDetail = lazy(() => import("@/pages/KoleksiDetail"));
const FaqHub = lazy(() => import("@/pages/FaqHub"));
const BlogIndex = lazy(() => import("@/pages/BlogIndex"));
const BlogDetail = lazy(() => import("@/pages/BlogDetail"));
const PromoIndex = lazy(() => import("@/pages/PromoIndex"));
const PromoDetail = lazy(() => import("@/pages/PromoDetail"));
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function AdminGuard({ component: Component }: { component: ComponentType }) {
  const token = getAdminToken();
  if (!token) return <Redirect to="/admin" />;
  return <Component />;
}

function PageFallback() {
  return (
    <div className="container mx-auto p-6 space-y-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
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
      <Route path="/admin/seo">
        {() => <AdminGuard component={AdminSeoAudit} />}
      </Route>
      <Route path="/about" component={AboutPage} />
      <Route path="/sitemap" component={SitemapPage} />
      <Route path="/compare" component={ComparePage} />
      <Route path="/trending" component={TrendingPage} />
      <Route path="/terbaik" component={BestOfIndex} />
      <Route path="/terbaik/:slug" component={BestOfDetail} />
      <Route path="/harga-turun" component={PriceDrops} />
      <Route path="/vs/:pair" component={VsPage} />
      <Route path="/brand" component={BrandIndex} />
      <Route path="/brand/:slug" component={BrandDetail} />
      <Route path="/koleksi" component={KoleksiIndex} />
      <Route path="/koleksi/:slug" component={KoleksiDetail} />
      <Route path="/faq" component={FaqHub} />
      <Route path="/blog" component={BlogIndex} />
      <Route path="/blog/:slug" component={BlogDetail} />
      <Route path="/promo" component={PromoIndex} />
      <Route path="/promo/:slug" component={PromoDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Suspense fallback={<PageFallback />}>
            <Router />
          </Suspense>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
