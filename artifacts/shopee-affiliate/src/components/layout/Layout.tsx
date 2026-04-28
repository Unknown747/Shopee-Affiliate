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
  ShieldCheck,
  Truck,
  Sparkles,
  Menu,
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

function useSuggestions(query: string) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);

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

  return { suggestions, loading };
}

function SuggestList({
  suggestions,
  loading,
  query,
  onPick,
  onSubmit,
}: {
  suggestions: Suggestion[];
  loading: boolean;
  query: string;
  onPick: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="max-h-[60vh] overflow-y-auto">
      {loading && (
        <div className="text-xs text-muted-foreground p-3">Mencari…</div>
      )}
      {!loading && query.trim().length >= 2 && suggestions.length === 0 && (
        <div className="text-xs text-muted-foreground p-3">
          Tidak ada hasil. Tekan Enter untuk pencarian lengkap.
        </div>
      )}
      {!loading &&
        suggestions.map((s) => (
          <Link
            key={s.id}
            href={`/product/${s.slug}`}
            onClick={onPick}
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
          onClick={onSubmit}
          className="w-full mt-2 text-xs text-primary hover:underline text-center p-2"
        >
          Lihat semua hasil untuk "{query}" →
        </button>
      )}
      {query.trim().length < 2 && !loading && (
        <div className="text-xs text-muted-foreground p-3">
          Ketik minimal 2 huruf untuk mulai mencari
        </div>
      )}
    </div>
  );
}

function InlineSearch() {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { suggestions, loading } = useSuggestions(query);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    setLocation(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div ref={wrapRef} className="relative w-full max-w-xl">
      <form onSubmit={submit}>
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Cari produk, kategori, atau brand…"
            className="w-full h-10 pl-9 pr-24 rounded-full border border-border bg-muted/40 text-sm outline-none focus:bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <button
            type="submit"
            className="absolute right-1 h-8 px-4 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-colors"
          >
            Cari
          </button>
        </div>
      </form>
      {open && (query.trim().length >= 2 || loading) && (
        <div className="absolute left-0 right-0 top-12 bg-background border border-border rounded-xl shadow-xl z-50 p-2">
          <SuggestList
            suggestions={suggestions}
            loading={loading}
            query={query}
            onPick={() => setOpen(false)}
            onSubmit={() => submit()}
          />
        </div>
      )}
    </div>
  );
}

function MobileSearch() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { suggestions, loading } = useSuggestions(query);

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
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
    else setQuery("");
  }, [open]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
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
        <div className="fixed left-0 right-0 top-[6.25rem] bg-background border-y border-border shadow-xl z-50 p-3">
          <form onSubmit={submit}>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari produk…"
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary"
            />
          </form>
          <div className="mt-2">
            <SuggestList
              suggestions={suggestions}
              loading={loading}
              query={query}
              onPick={() => setOpen(false)}
              onSubmit={() => submit()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PromoBar() {
  return (
    <div className="hidden md:block bg-gradient-to-r from-primary via-primary to-orange-600 text-primary-foreground text-xs">
      <div className="container mx-auto px-4 h-8 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            <span className="font-medium">Review jujur · update tiap hari</span>
          </span>
          <span className="hidden lg:inline-flex items-center gap-1.5 opacity-90">
            <Truck className="h-3 w-3" />
            <span>Mayoritas produk gratis ongkir</span>
          </span>
          <span className="hidden lg:inline-flex items-center gap-1.5 opacity-90">
            <ShieldCheck className="h-3 w-3" />
            <span>Resmi · partner Shopee Affiliate</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/about" className="hover:underline opacity-90">
            Tentang Kami
          </Link>
          <Link href="/sitemap" className="hover:underline opacity-90">
            Sitemap
          </Link>
        </div>
      </div>
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  const navLinks = [
    { href: "/", label: "Beranda" },
    { href: "/search", label: "Semua Produk" },
    { href: "/trending", label: "Trending" },
    { href: "/about", label: "Tentang" },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <PromoBar />

      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center gap-3 md:gap-6">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 text-primary hover:text-primary/90 transition-colors flex-none"
          >
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-orange-600 text-primary-foreground flex items-center justify-center shadow-md">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <span className="font-extrabold text-lg tracking-tight hidden sm:inline-block">
              Shopee<span className="text-foreground">Recommend</span>
            </span>
          </Link>

          {/* Inline search (desktop) */}
          <div className="hidden md:flex flex-1 justify-center">
            <InlineSearch />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 ml-auto md:ml-0">
            <div className="md:hidden">
              <MobileSearch />
            </div>

            <Button
              variant="ghost"
              size="icon"
              asChild
              className="relative"
              aria-label="Bandingkan"
            >
              <Link href="/compare">
                <GitCompare className="h-5 w-5" />
                {compareCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
                    {compareCount}
                  </span>
                )}
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              asChild
              className="relative"
              aria-label="Wishlist"
            >
              <Link href="/wishlist">
                <Heart
                  className={`h-5 w-5 ${wishlistCount > 0 ? "fill-primary text-primary" : ""}`}
                />
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
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label="Menu"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            {isAuthenticated && (
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="hidden sm:inline-flex ml-1"
              >
                Keluar
              </Button>
            )}
          </div>
        </div>

        {/* Sub-nav (desktop) */}
        <div className="hidden md:block border-t border-border/60 bg-background/50">
          <div className="container mx-auto px-4 h-10 flex items-center gap-6 text-sm">
            {navLinks.map((l) => {
              const active =
                l.href === "/"
                  ? location === "/"
                  : location.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`relative py-2 font-medium transition-colors ${
                    active
                      ? "text-primary"
                      : "text-foreground/70 hover:text-foreground"
                  }`}
                >
                  {l.label}
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileNavOpen && (
          <div className="md:hidden border-t border-border bg-background">
            <nav className="container mx-auto px-4 py-2 flex flex-col text-sm">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileNavOpen(false)}
                  className="py-2.5 border-b border-border/40 last:border-0 font-medium hover:text-primary"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
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
                  <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Konfigurasi
                  </p>
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
            <div className="min-w-0">{children}</div>
          </div>
        ) : (
          children
        )}
      </main>

      <footer className="border-t border-border bg-card mt-auto">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-10">
            <div>
              <Link
                href="/"
                className="flex items-center gap-2 text-primary mb-4"
              >
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-orange-600 text-primary-foreground flex items-center justify-center shadow-md">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <span className="font-extrabold text-lg tracking-tight">
                  Shopee<span className="text-foreground">Recommend</span>
                </span>
              </Link>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                Rekomendasi produk Shopee terbaik, dikurasi objektif untuk
                membantu Anda berbelanja lebih cerdas dan hemat.
              </p>
              <div className="flex items-center gap-3 mt-5">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Aman & terpercaya
                </span>
              </div>
            </div>
            <div>
              <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-foreground/80">
                Jelajahi
              </h3>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li>
                  <Link href="/" className="hover:text-primary transition-colors">
                    Beranda
                  </Link>
                </li>
                <li>
                  <Link
                    href="/search"
                    className="hover:text-primary transition-colors"
                  >
                    Semua Produk
                  </Link>
                </li>
                <li>
                  <Link
                    href="/trending"
                    className="hover:text-primary transition-colors"
                  >
                    Trending
                  </Link>
                </li>
                <li>
                  <Link
                    href="/about"
                    className="hover:text-primary transition-colors"
                  >
                    Tentang Kami
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-foreground/80">
                Personal
              </h3>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li>
                  <Link
                    href="/wishlist"
                    className="hover:text-primary transition-colors"
                  >
                    Wishlist Saya
                  </Link>
                </li>
                <li>
                  <Link
                    href="/compare"
                    className="hover:text-primary transition-colors"
                  >
                    Bandingkan Produk
                  </Link>
                </li>
                <li>
                  <Link
                    href="/sitemap"
                    className="hover:text-primary transition-colors"
                  >
                    Sitemap
                  </Link>
                </li>
                <li>
                  <a
                    href="/feed.xml"
                    className="hover:text-primary transition-colors"
                  >
                    RSS Feed
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-foreground/80">
                Disclaimer Afiliasi
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sebagai mitra afiliasi resmi Shopee, kami menerima komisi dari
                pembelian yang memenuhi syarat melalui tautan di situs ini —
                tanpa biaya tambahan untuk Anda.
              </p>
            </div>
          </div>
          <div className="border-t border-border mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              &copy; {new Date().getFullYear()} ShopeeRecommend. Hak cipta
              dilindungi.
            </span>
            <span>Dibuat dengan ❤️ untuk pembelanja Indonesia.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
