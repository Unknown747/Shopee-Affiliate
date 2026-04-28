import { useEffect, useState } from "react";
import { TrendingUp, Flame } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SeoHead } from "@/components/SeoHead";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { Product } from "@workspace/api-client-react";

const API_BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

export default function TrendingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/stats/trending`)
      .then((r) => r.json())
      .then((data) => setProducts(data.products ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <SeoHead
        title="Produk Trending Minggu Ini"
        description="Daftar produk paling banyak diklik dan dilihat pengunjung minggu ini. Update otomatis berdasarkan minat pembaca."
      />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Flame className="h-7 w-7 text-primary" />
            Trending Minggu Ini
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4" />
            Produk paling banyak diklik & dilihat oleh pengunjung lain
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square rounded-xl" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">
            Belum ada data trending. Silakan kembali nanti.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((p, i) => (
              <div key={p.id} className="relative">
                <span className="absolute -top-2 -left-2 z-10 h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow">
                  #{i + 1}
                </span>
                <ProductCard product={p} priority={i < 4} />
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
