import { Link } from "wouter";
import { useEffect, useState } from "react";
import { Store, ChevronRight, Star } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SeoHead } from "@/components/SeoHead";
import { Skeleton } from "@/components/ui/skeleton";
import { setBreadcrumbLd, removeJsonLd } from "@/lib/jsonld";

const API_BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

type Brand = {
  name: string;
  slug: string;
  productCount: number;
  avgRating: number;
};

export default function BrandIndex() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/brands`)
      .then((r) => r.json())
      .then((d) => setBrands(d.brands ?? []))
      .catch(() => setBrands([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setBreadcrumbLd("ld-breadcrumb-brand", [
      { name: "Beranda", path: "/" },
      { name: "Brand & Toko", path: "/brand" },
    ]);
    return () => removeJsonLd("ld-breadcrumb-brand");
  }, []);

  return (
    <Layout>
      <SeoHead
        title="Brand & Toko Pilihan"
        description="Daftar brand dan toko Shopee yang paling sering kami review. Eksplor produk dari brand favorit Anda."
      />
      <div className="container mx-auto px-4 py-8">
        <nav className="text-xs text-muted-foreground mb-3">
          <Link href="/" className="hover:underline">
            Beranda
          </Link>{" "}
          / <span>Brand & Toko</span>
        </nav>
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Store className="h-7 w-7 text-primary" />
            Brand & Toko Pilihan
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Eksplor produk berdasarkan brand atau toko Shopee favorit Anda.
            Daftar otomatis di-update sesuai katalog yang kami review.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : brands.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">
            Belum ada brand dengan cukup produk. Cek lagi nanti.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {brands.map((b) => (
              <Link
                key={b.slug}
                href={`/brand/${b.slug}`}
                className="group flex items-center justify-between gap-3 p-5 rounded-xl border border-border bg-card hover:border-primary hover:shadow-md transition-all"
              >
                <div className="min-w-0">
                  <h2 className="font-semibold text-base group-hover:text-primary transition-colors truncate">
                    {b.name}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {b.productCount} produk
                    {b.avgRating > 0 && (
                      <span className="inline-flex items-center gap-0.5 ml-2">
                        ·{" "}
                        <Star className="h-3 w-3 text-amber-500 fill-current" />
                        {b.avgRating.toFixed(1)}
                      </span>
                    )}
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
