import { Link } from "wouter";
import { useEffect, useState } from "react";
import { TrendingDown, Tag } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SeoHead } from "@/components/SeoHead";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { setBreadcrumbLd, setItemListLd, removeJsonLd } from "@/lib/jsonld";
import type { Product } from "@workspace/api-client-react";

const API_BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

type DropProduct = Product & { dropPct: number };

type Response = {
  products: DropProduct[];
  windowDays: number;
};

export default function PriceDrops() {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/price-drops`)
      .then((r) => r.json())
      .then((d: Response) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setBreadcrumbLd("ld-breadcrumb-pricedrops", [
      { name: "Beranda", path: "/" },
      { name: "Harga Turun", path: "/harga-turun" },
    ]);
    if (data?.products?.length) {
      setItemListLd("ld-pricedrops-list", data.products);
    }
    return () => {
      removeJsonLd("ld-breadcrumb-pricedrops");
      removeJsonLd("ld-pricedrops-list");
    };
  }, [data]);

  const products = data?.products ?? [];
  const windowDays = data?.windowDays ?? 7;

  return (
    <Layout>
      <SeoHead
        title="Produk Harga Turun Hari Ini"
        description={`Daftar produk Shopee yang harganya turun dalam ${windowDays} hari terakhir. Update otomatis — pantau diskon terbaru tanpa perlu cek satu-satu.`}
      />
      <div className="container mx-auto px-4 py-8">
        <nav className="text-xs text-muted-foreground mb-3">
          <Link href="/" className="hover:underline">
            Beranda
          </Link>{" "}
          / <span>Harga Turun</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingDown className="h-7 w-7 text-emerald-600" />
            Produk Harga Turun
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Daftar produk yang harganya turun dibanding {windowDays} hari yang
            lalu. Cocok buat berburu diskon — diurutkan dari penurunan terbesar.
          </p>
          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-xs font-medium">
            <Tag className="h-3.5 w-3.5" />
            Pelacakan harga otomatis
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square rounded-xl" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">
              Belum ada penurunan harga dalam {windowDays} hari terakhir.
            </p>
            <p className="text-xs text-muted-foreground">
              Kami pantau harga setiap kali produk di-refresh — kembali lagi
              besok untuk lihat update terbaru.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((p, i) => (
              <div key={p.id} className="relative">
                <span className="absolute -top-2 -right-2 z-10 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold shadow flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  -{p.dropPct}%
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
