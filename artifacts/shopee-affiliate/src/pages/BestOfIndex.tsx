import { Link } from "wouter";
import { useEffect, useState } from "react";
import { Trophy, ChevronRight } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SeoHead } from "@/components/SeoHead";
import { Skeleton } from "@/components/ui/skeleton";
import { setBreadcrumbLd, removeJsonLd } from "@/lib/jsonld";

const API_BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

type CategoryItem = {
  category: string;
  slug: string;
  productCount: number;
};

export default function BestOfIndex() {
  const [items, setItems] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/best-of`)
      .then((r) => r.json())
      .then((d) => setItems(d.categories ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setBreadcrumbLd("ld-breadcrumb-bestof", [
      { name: "Beranda", path: "/" },
      { name: "Produk Terbaik", path: "/terbaik" },
    ]);
    return () => removeJsonLd("ld-breadcrumb-bestof");
  }, []);

  return (
    <Layout>
      <SeoHead
        title="Produk Terbaik per Kategori"
        description="Daftar produk Shopee terbaik per kategori — dipilih dari rating, jumlah terjual, dan minat pembaca. Update otomatis tiap minggu."
      />
      <div className="container mx-auto px-4 py-8">
        <nav className="text-xs text-muted-foreground mb-3">
          <Link href="/" className="hover:underline">
            Beranda
          </Link>{" "}
          / <span>Produk Terbaik</span>
        </nav>
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-7 w-7 text-amber-500" />
            Produk Terbaik per Kategori
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Setiap halaman merangkum 10 produk terbaik dari kategorinya, diurutkan
            berdasarkan rating, jumlah terjual, dan minat pembaca lain. Cocok
            untuk inspirasi sebelum belanja.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">
            Belum ada kategori dengan cukup produk untuk dijadikan ranking.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((it) => (
              <Link
                key={it.slug}
                href={`/terbaik/${it.slug}`}
                className="group flex items-center justify-between gap-3 p-5 rounded-xl border border-border bg-card hover:border-primary hover:shadow-md transition-all"
              >
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Top 10
                  </div>
                  <h2 className="font-semibold text-base group-hover:text-primary transition-colors truncate">
                    {it.category}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {it.productCount} produk dalam kategori
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-none" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
