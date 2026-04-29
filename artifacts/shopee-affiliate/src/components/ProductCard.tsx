import { Link } from "wouter";
import { Star, MapPin, Truck, GitCompareArrows } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Product } from "@workspace/api-client-react";
import { formatIdr, formatNumber } from "@/lib/format";
import { useTrackProductClick } from "@workspace/api-client-react";
import { useCompare } from "@/hooks/use-compare";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

interface ProductCardProps {
  product: Product;
  /** When true, the image loads eagerly with high priority (use for above-the-fold cards) */
  priority?: boolean;
}

const prefetched = new Set<string>();

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const trackClick = useTrackProductClick();
  const { isInCompare, toggle: toggleCompare, count: compareCount, max: compareMax } = useCompare();
  const { toast } = useToast();
  const inCompare = isInCompare(product.id);
  const queryClient = useQueryClient();
  const prefetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePrefetch = () => {
    if (prefetched.has(product.slug)) return;
    if (prefetchTimer.current) return;
    prefetchTimer.current = setTimeout(() => {
      prefetched.add(product.slug);
      queryClient.prefetchQuery({
        queryKey: ["GET", "/api/products/{slug}", { slug: product.slug }],
        queryFn: async () => {
          const res = await fetch(`/api/products/${encodeURIComponent(product.slug)}`);
          if (!res.ok) throw new Error("prefetch failed");
          return res.json();
        },
        staleTime: 60_000,
      });
    }, 120);
  };

  const cancelPrefetch = () => {
    if (prefetchTimer.current) {
      clearTimeout(prefetchTimer.current);
      prefetchTimer.current = null;
    }
  };

  const handleOutboundClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackClick.mutate({
      id: product.id,
      data: { referer: window.location.href },
    });
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = toggleCompare(product.id);
    if (result.full) {
      toast({
        title: `Maksimal ${compareMax} produk`,
        description: "Hapus salah satu produk dari daftar perbandingan terlebih dahulu.",
        variant: "destructive",
      });
    } else if (result.added) {
      toast({
        title: "Ditambahkan ke perbandingan",
        description: `Total ${compareCount + 1}/${compareMax} produk siap dibandingkan.`,
      });
    }
  };

  const discount =
    product.priceBeforeDisc && product.priceBeforeDisc > product.price
      ? Math.round(
          ((product.priceBeforeDisc - product.price) /
            product.priceBeforeDisc) *
            100,
        )
      : 0;

  const sold = product.soldCount ?? 0;
  const rating = product.ratingStar ?? 0;
  const isHot = sold > 1000;

  return (
    <Link
      href={`/product/${product.slug}`}
      onMouseEnter={handlePrefetch}
      onMouseLeave={cancelPrefetch}
      onFocus={handlePrefetch}
      onTouchStart={handlePrefetch}
      className="group relative block rounded-xl overflow-hidden bg-card border border-border hover:border-primary/40 hover:shadow-[0_8px_24px_-12px_rgba(238,77,45,0.25)] transition-all duration-200 h-full"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="object-cover w-full h-full group-hover:scale-[1.04] transition-transform duration-500"
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          {...(priority ? { fetchpriority: "high" as const } : {})}
        />

        {/* Discount corner ribbon */}
        {discount > 0 && (
          <div className="absolute top-0 left-0">
            <div className="bg-primary text-primary-foreground px-2 py-1 rounded-br-lg shadow-md">
              <div className="text-[11px] font-bold leading-none">-{discount}%</div>
            </div>
          </div>
        )}

        {/* Hot badge */}
        {isHot && discount === 0 && (
          <Badge className="absolute top-2 left-2 bg-secondary text-secondary-foreground border-0 shadow-md font-bold text-[10px] px-1.5 py-0.5">
            HOT
          </Badge>
        )}

        {/* Compare action */}
        <button
          type="button"
          onClick={handleCompare}
          aria-label={inCompare ? "Hapus dari perbandingan" : "Bandingkan produk ini"}
          title={inCompare ? "Hapus dari perbandingan" : "Bandingkan produk ini"}
          aria-pressed={inCompare}
          className={`absolute top-2 right-2 h-8 w-8 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-all shadow-sm ${
            inCompare
              ? "text-primary opacity-100"
              : "text-foreground/70 hover:text-primary opacity-0 group-hover:opacity-100 focus:opacity-100"
          }`}
        >
          <GitCompareArrows className="h-4 w-4" />
        </button>

        {/* Hover quick action */}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={handleOutboundClick}
            className="w-full text-center"
          >
            <a
              href={product.affiliateLink}
              target="_blank"
              rel="sponsored nofollow noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="block w-full h-9 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold flex items-center justify-center transition-colors"
            >
              Beli Sekarang
            </a>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-1.5">
        {/* Title */}
        <h3 className="text-sm font-medium line-clamp-2 leading-snug min-h-[2.5rem] group-hover:text-primary transition-colors">
          {product.name}
        </h3>

        {/* Price block */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-lg font-extrabold text-primary leading-none">
            {formatIdr(product.price)}
          </span>
          {discount > 0 && (
            <span className="text-xs text-muted-foreground line-through">
              {formatIdr(product.priceBeforeDisc!)}
            </span>
          )}
        </div>

        {/* Free shipping badge */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            <Truck className="h-3 w-3" />
            GRATIS ONGKIR
          </span>
          {product.category && (
            <span className="text-[10px] text-muted-foreground capitalize truncate">
              {product.category}
            </span>
          )}
        </div>

        {/* Rating + sold */}
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground pt-1 border-t border-border/60 mt-1">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-secondary text-secondary" />
            <span className="font-semibold text-foreground/80">
              {rating > 0 ? rating.toFixed(1) : "Baru"}
            </span>
          </div>
          <span className="text-muted-foreground">
            {sold > 0 ? `${formatNumber(sold)} terjual` : "Baru rilis"}
          </span>
        </div>

        {/* Location-style row (shop) */}
        {product.shopName && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
            <MapPin className="h-2.5 w-2.5 flex-none" />
            <span className="truncate">{product.shopName}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
