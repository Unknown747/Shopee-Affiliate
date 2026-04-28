import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Heart, ArrowRight, Trash2 } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useWishlist } from "@/hooks/use-wishlist";
import type { Product } from "@workspace/api-client-react";

const API_BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

export default function WishlistPage() {
  const { ids, count, clear } = useWishlist();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Wishlist Saya - ShopeeRecommend";
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = "Daftar produk favorit Anda yang ingin dibeli nanti.";

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
    Promise.all(
      ids.map((id) =>
        fetch(`${API_BASE}/api/products/${id}`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ),
    )
      .then((all) => {
        if (cancelled) return;
        const valid = all.filter((p): p is Product => Boolean(p));
        if (valid.length === 0) {
          fetch(`${API_BASE}/api/products?limit=100`)
            .then((r) => r.json())
            .then((data) => {
              if (cancelled) return;
              const filtered = (data.products as Product[]).filter((p) =>
                ids.includes(p.id),
              );
              setProducts(filtered);
            })
            .finally(() => {
              if (!cancelled) setLoading(false);
            });
        } else {
          setProducts(valid);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Heart className="h-7 w-7 text-primary" />
              Wishlist Saya
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {count} produk tersimpan di perangkat ini
            </p>
          </div>
          {count > 0 && (
            <Button variant="outline" size="sm" onClick={clear} className="gap-2">
              <Trash2 className="h-4 w-4" /> Kosongkan
            </Button>
          )}
        </div>

        {count === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-xl">
            <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">Wishlist masih kosong</p>
            <p className="text-sm text-muted-foreground mb-6">
              Tap ikon hati di kartu produk untuk menyimpan favorit Anda.
            </p>
            <Button asChild>
              <Link href="/search">
                Eksplorasi Produk <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: ids.length || 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square rounded-xl" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
