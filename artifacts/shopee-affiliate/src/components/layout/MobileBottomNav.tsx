import { Link, useLocation } from "wouter";
import { Home, Search, TrendingDown, GitCompareArrows } from "lucide-react";
import { useCompare } from "@/hooks/use-compare";

const NAV_ITEMS = [
  { href: "/", label: "Beranda", icon: Home, exact: true },
  { href: "/search", label: "Produk", icon: Search },
  { href: "/harga-turun", label: "Diskon", icon: TrendingDown },
  { href: "/compare", label: "Bandingin", icon: GitCompareArrows, badge: "compare" as const },
];

export function MobileBottomNav() {
  const [location] = useLocation();
  const { count: compareCount } = useCompare();

  // Hide on admin pages where space is critical
  if (location.startsWith("/admin") && location !== "/admin") return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.08)]"
      aria-label="Navigasi utama mobile"
    >
      <div className="grid grid-cols-4">
        {NAV_ITEMS.map((it) => {
          const active = it.exact
            ? location === it.href
            : location === it.href || location.startsWith(`${it.href}/`);
          const badgeCount = it.badge === "compare" ? compareCount : 0;
          const showBadge = !!it.badge && badgeCount > 0;
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
                <it.icon className="h-5 w-5" />
                {showBadge && (
                  <span className="absolute -top-1 -right-2 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium leading-none">
                {it.label}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)] bg-background" />
    </nav>
  );
}
