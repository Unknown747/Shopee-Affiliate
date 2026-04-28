import { useEffect, useState } from "react";
import { Link } from "wouter";
import { GitCompare, X, ArrowRight, ShoppingCart, Star } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useCompare } from "@/hooks/use-compare";
import { formatIdr, formatNumber } from "@/lib/format";
import type { Product } from "@workspace/api-client-react";

const API_BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

export default function ComparePage() {
  const { ids, count, max, remove, clear } = useCompare();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Bandingkan Produk - ShopeeRecommend";
    let robots = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = "noindex, nofollow";
  }, []);

  useEffect(() => {
    if (ids.length === 0) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/api/products?limit=200`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const filtered = (data.products as Product[]).filter((p) => ids.includes(p.id));
        setProducts(filtered);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  const cheapest = products.reduce<Product | null>(
    (acc, p) => (!acc || p.price < acc.price ? p : acc),
    null,
  );
  const highestRated = products.reduce<Product | null>(
    (acc, p) =>
      !acc || (p.ratingStar ?? 0) > (acc.ratingStar ?? 0) ? p : acc,
    null,
  );
  const mostSold = products.reduce<Product | null>(
    (acc, p) => (!acc || (p.soldCount ?? 0) > (acc.soldCount ?? 0) ? p : acc),
    null,
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <GitCompare className="h-7 w-7 text-primary" />
              Bandingkan Produk
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {count}/{max} produk dipilih untuk dibandingkan
            </p>
          </div>
          {count > 0 && (
            <Button variant="outline" size="sm" onClick={clear}>
              Hapus Semua
            </Button>
          )}
        </div>

        {count === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-xl">
            <GitCompare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Belum ada produk dibandingkan</p>
            <p className="text-sm text-muted-foreground mb-6">
              Buka halaman produk dan tap "Bandingkan" untuk menambahkan (maksimal {max}).
            </p>
            <Button asChild>
              <Link href="/search">
                Eksplorasi Produk <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : loading ? (
          <Skeleton className="h-80 w-full" />
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-sm font-medium text-muted-foreground p-3 w-32">Spesifikasi</th>
                  {products.map((p) => (
                    <th key={p.id} className="p-3 align-top min-w-[200px]">
                      <div className="relative">
                        <button
                          onClick={() => remove(p.id)}
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:opacity-90"
                          aria-label="Hapus dari bandingkan"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <Link href={`/product/${p.slug}`}>
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            loading="lazy"
                            className="w-full aspect-square object-cover rounded-lg border border-border"
                          />
                          <div className="text-sm font-semibold mt-2 line-clamp-2 text-left hover:text-primary transition-colors">
                            {p.name}
                          </div>
                        </Link>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-t border-border">
                  <td className="p-3 font-medium text-muted-foreground">Harga</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-bold text-primary">{formatIdr(p.price)}</span>
                        {cheapest?.id === p.id && count > 1 && (
                          <Badge variant="secondary" className="text-xs">Termurah</Badge>
                        )}
                      </div>
                      {p.priceBeforeDisc && p.priceBeforeDisc > p.price && (
                        <div className="text-xs text-muted-foreground line-through">
                          {formatIdr(p.priceBeforeDisc)}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-border">
                  <td className="p-3 font-medium text-muted-foreground">Rating Produk</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-secondary fill-current" />
                          {p.ratingStar?.toFixed(1) ?? "-"}
                        </span>
                        {highestRated?.id === p.id && count > 1 && (
                          <Badge variant="secondary" className="text-xs">Tertinggi</Badge>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-border">
                  <td className="p-3 font-medium text-muted-foreground">Terjual</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{formatNumber(p.soldCount ?? 0)}</span>
                        {mostSold?.id === p.id && count > 1 && (
                          <Badge variant="secondary" className="text-xs">Paling Laris</Badge>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-border">
                  <td className="p-3 font-medium text-muted-foreground">Toko</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-3 text-xs">
                      {p.shopName ?? "-"}
                      {p.shopRating != null && (
                        <div className="text-muted-foreground">★ {p.shopRating.toFixed(1)}</div>
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-border">
                  <td className="p-3 font-medium text-muted-foreground">Kategori</td>
                  {products.map((p) => (
                    <td key={p.id} className="p-3 text-xs capitalize">
                      {p.category ?? "-"}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-border">
                  <td className="p-3"></td>
                  {products.map((p) => (
                    <td key={p.id} className="p-3">
                      <Button asChild className="w-full gap-2" size="sm">
                        <a
                          href={p.affiliateLink}
                          target="_blank"
                          rel="sponsored nofollow noopener noreferrer"
                        >
                          <ShoppingCart className="h-4 w-4" /> Beli
                        </a>
                      </Button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
