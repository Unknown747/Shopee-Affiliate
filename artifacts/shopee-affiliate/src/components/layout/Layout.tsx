import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Search, Moon, Sun, ShoppingBag, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useAdmin } from "@/hooks/use-admin";

export function Layout({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useTheme();
  const { isAuthenticated, logout } = useAdmin();
  const [location] = useLocation();
  const isAdmin = location.startsWith("/admin") && location !== "/admin";

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/90 transition-colors">
              <ShoppingBag className="h-6 w-6" />
              <span className="font-bold text-xl hidden sm:inline-block">ShopeeRecommend</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link href="/" className="hover:text-primary transition-colors">Beranda</Link>
              <Link href="/search" className="hover:text-primary transition-colors">Semua Produk</Link>
              <Link href="/about" className="hover:text-primary transition-colors">Tentang Kami</Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/search">
                <Search className="h-5 w-5" />
                <span className="sr-only">Cari</span>
              </Link>
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              <span className="sr-only">Toggle theme</span>
            </Button>

            {isAuthenticated && (
              <Button variant="outline" size="sm" onClick={logout} className="hidden sm:inline-flex">
                Keluar
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {isAdmin ? (
          <div className="container mx-auto px-4 py-8 flex-1 grid md:grid-cols-[200px_1fr] gap-8">
            <aside className="space-y-2">
              <nav className="flex flex-col gap-1">
                <Link 
                  href="/admin/dashboard" 
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location === "/admin/dashboard" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  Dashboard
                </Link>
                <Link 
                  href="/admin/products" 
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location === "/admin/products" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  Kelola Produk
                </Link>
                <Link 
                  href="/generate" 
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${location === "/generate" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  AI Content
                </Link>
                <div className="pt-2 pb-1">
                  <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Konfigurasi</p>
                </div>
                <Link 
                  href="/admin/settings" 
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${location === "/admin/settings" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  <Settings className="h-4 w-4" />
                  Pengaturan SEO
                </Link>
              </nav>
            </aside>
            <div className="min-w-0">
              {children}
            </div>
          </div>
        ) : (
          children
        )}
      </main>

      <footer className="border-t border-border bg-muted/40 py-12 mt-auto">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <Link href="/" className="flex items-center gap-2 text-primary mb-4">
                <ShoppingBag className="h-6 w-6" />
                <span className="font-bold text-xl">ShopeeRecommend</span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                Rekomendasi produk terbaik dari Shopee, dikurasi secara objektif untuk membantu Anda berbelanja lebih cerdas.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Tautan</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/" className="hover:text-foreground transition-colors">Beranda</Link></li>
                <li><Link href="/search" className="hover:text-foreground transition-colors">Semua Produk</Link></li>
                <li><Link href="/about" className="hover:text-foreground transition-colors">Tentang Kami</Link></li>
                <li><Link href="/sitemap" className="hover:text-foreground transition-colors">Sitemap</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Disclaimer Afiliasi</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sebagai mitra afiliasi Shopee, kami mendapat komisi dari pembelian yang memenuhi syarat yang dilakukan melalui tautan di situs ini, tanpa biaya tambahan bagi Anda.
              </p>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ShopeeRecommend. Hak cipta dilindungi.
          </div>
        </div>
      </footer>
    </div>
  );
}
