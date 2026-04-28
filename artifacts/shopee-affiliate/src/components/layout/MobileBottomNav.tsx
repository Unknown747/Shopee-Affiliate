import { Link, useLocation } from "wouter";
import { Home, Search, Flame, Heart, User } from "lucide-react";
import { useWishlist } from "@/hooks/use-wishlist";
import { useAdmin } from "@/hooks/use-admin";

const NAV_ITEMS = [
  { href: "/", label: "Beranda", icon: Home, exact: true },
  { href: "/search", label: "Produk", icon: Search },
  { href: "/trending", label: "Trending", icon: Flame },
  { href: "/wishlist", label: "Wishlist", icon: Heart, badge: "wishlist" as const },
];

export function MobileBottomNav() {
  const [location] = useLocation();
  const { count: wishlistCount } = useWishlist();
  const { isAuthenticated } = useAdmin();

  // Hide on admin pages where space is critical
  if (location.startsWith("/admin") && location !== "/admin") return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.08)]"
      aria-label="Navigasi utama mobile"
    >
      <div className="grid grid-cols-5">
        {NAV_ITEMS.map((it) => {
          const active = it.exact
            ? location === it.href
            : location.startsWith(it.href);
          const showBadge = it.badge === "wishlist" && wishlistCount > 0;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="relative">
                <it.icon
                  className={`h-5 w-5 ${
                    active && it.icon === Heart ? "fill-primary" : ""
                  }`}
                />
                {showBadge && (
                  <span className="absolute -top-1 -right-2 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                    {wishlistCount > 9 ? "9+" : wishlistCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium leading-none">
                {it.label}
              </span>
            </Link>
          );
        })}
        <Link
          href={isAuthenticated ? "/admin/dashboard" : "/about"}
          className={`flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
            location.startsWith("/admin") || location === "/about"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="h-5 w-5" />
          <span className="text-[10px] font-medium leading-none">
            {isAuthenticated ? "Admin" : "Akun"}
          </span>
        </Link>
      </div>
      <div className="h-[env(safe-area-inset-bottom)] bg-background" />
    </nav>
  );
}
