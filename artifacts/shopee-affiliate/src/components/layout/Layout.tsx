import { ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Search,
  Moon,
  Sun,
  ShoppingBag,
  Settings,
  Heart,
  GitCompare,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useAdmin } from "@/hooks/use-admin";
import { useWishlist } from "@/hooks/use-wishlist";
import { useCompare } from "@/hooks/use-compare";
import { formatIdr } from "@/lib/format";

const API_BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

type Suggestion = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  price: number;
  category: string | null;
};

function SearchBar() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery("");
      setSuggestions([]);
    }
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      setLoading(true);
      fetch(`${API_BASE}/api/search/suggest?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => setSuggestions(data.suggestions ?? []))
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    setLocation(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div ref={wrapRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        aria-label="Cari"
      >
        {open ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
      </Button>
      {open && (
        <div className="fixed sm:absolute left-0 right-0 sm:left-auto sm:right-0 top-16 sm:top-12 sm:w-96 bg-background border border-border sm:rounded-xl shadow-xl z-50 p-3">
          <form onSubmit={submit}>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari produk, kategori, brand..."
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary"
            />
          </form>
          <div className="mt-2 max-h-[60vh] overflow-y-auto">
            {loading && (
              <div className="text-xs text-muted-foreground p-2">Mencari...</div>
            )}
            {!loading && query.trim().length >= 2 && suggestions.length === 0 && (
              <div className="text-xs text-muted-foreground p-2">
                Tidak ada hasil. Tekan Enter untuk pencarian lengkap.
              </div>
            )}
            {!loading &&
              suggestions.map((s) => (
                <Link
                  key={s.id}
                  href={`/product/${s.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <img
                    src={s.imageUrl}
                    alt={s.name}
                    loading="lazy"
                    className="h-10 w-10 rounded object-cover bg-muted flex-none"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium line-clamp-1">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.category ?? "Produk"} · {formatIdr(s.price)}
                    </div>
                  </div>
                </Link>
              ))}
            {query.trim().length >= 2 && (
              <button
                onClick={submit}
                className="w-full mt-2 text-xs text-primary hover:underline text-center p-2"
              >
                Lihat semua hasil untuk "{query}" →
              </button>
            )}
            {query.trim().length < 2 && (
              <div className="text-xs text-muted-foreground p-2">
                Ketik minimal 2 huruf untuk mencari
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useTheme();
  const { isAuthenticated, logout } = useAdmin();
  const [location] = useLocation();
  const isAdmin = location.startsWith("/admin") && location !== "/admin";
  const { count: wishlistCount } = useWishlist();
  const { count: compareCount } = useCompare();

  useEffect(() => {
    const id = "ld-org";
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("script");
      el.id = id;
      (el as HTMLScriptElement).type = "application/ld+json";
      document.head.appendChild(el);
    }
    const base = window.location.origin;
    el.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          name: "ShopeeRecommend",
          url: base,
          logo: `${base}/favicon.ico`,
        },
        {
          "@type": "WebSite",
          name: "ShopeeRecommend",
          url: base,
          potentialAction: {
            "@type": "SearchAction",
            target: `${base}/search?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        },
      ],
    });
  }, []);

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
              <Link href="/trending" className="hover:text-primary transition-colors">Trending</Link>
              <Link href="/about" className="hover:text-primary transition-colors">Tentang Kami</Link>
            </nav>
          </div>

          <div className="flex items-center gap-1">
            <SearchBar />

            <Button variant="ghost" size="icon" asChild className="relative" aria-label="Bandingkan">
              <Link href="/compare">
                <GitCompare className="h-5 w-5" />
                {compareCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
                    {compareCount}
                  </span>
                )}
              </Link>
            </Button>

            <Button variant="ghost" size="icon" asChild className="relative" aria-label="Wishlist">
              <Link href="/wishlist">
                <Heart className={`h-5 w-5 ${wishlistCount > 0 ? "fill-primary text-primary" : ""}`} />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>

            {isAuthenticated && (
              <Button variant="outline" size="sm" onClick={logout} className="hidden sm:inline-flex ml-1">
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
          <div className="grid md:grid-cols-4 gap-8">
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
                <li><Link href="/trending" className="hover:text-foreground transition-colors">Trending</Link></li>
                <li><Link href="/about" className="hover:text-foreground transition-colors">Tentang Kami</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Personal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/wishlist" className="hover:text-foreground transition-colors">Wishlist Saya</Link></li>
                <li><Link href="/compare" className="hover:text-foreground transition-colors">Bandingkan Produk</Link></li>
                <li><Link href="/sitemap" className="hover:text-foreground transition-colors">Sitemap</Link></li>
                <li><a href="/feed.xml" className="hover:text-foreground transition-colors">RSS Feed</a></li>
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
