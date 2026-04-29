import { Link, useParams } from "wouter";
import { useEffect, useState } from "react";
import { Store, ArrowLeft, Star } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SeoHead } from "@/components/SeoHead";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  setItemListLd,
  setBreadcrumbLd,
  setJsonLd,
  removeJsonLd,
} from "@/lib/jsonld";
import type { Product } from "@workspace/api-client-react";

const API_BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

type Response = {
  brand: string;
  slug: string;
  productCount: number;
  avgRating: number;
  products: Product[];
};

export default function BrandDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";

  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    fetch(`${API_BASE}/api/brands/${encodeURIComponent(slug)}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((d: Response | null) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!data) return;
    setItemListLd("ld-brand-list", data.products);
    setBreadcrumbLd("ld-breadcrumb-brand", [
      { name: "Beranda", path: "/" },
      { name: "Brand & Toko", path: "/brand" },
      { name: data.brand, path: `/brand/${data.slug}` },
    ]);
    setJsonLd("ld-brand-org", {
      "@context": "https://schema.org",
      "@type": "Brand",
      name: data.brand,
      ...(data.avgRating > 0
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: data.avgRating,
              reviewCount: Math.max(data.productCount, 1),
              bestRating: 5,
              worstRating: 1,
            },
          }
        : {}),
    });
    return () => {
      removeJsonLd("ld-brand-list");
      removeJsonLd("ld-breadcrumb-brand");
      removeJsonLd("ld-brand-org");
    };
  }, [data]);

  const title = data
    ? `Produk dari ${data.brand} — Review & Harga`
    : "Brand";
  const desc = data
    ? `Daftar ${data.productCount} produk dari ${data.brand} yang kami review. Cek rating, harga, dan kelebihan tiap produk.`
    : undefined;

  return (
    <Layout>
      <SeoHead
        title={title}
        description={desc}
        path={`/brand/${slug}`}
        noindex={notFound}
      />
      <div className="container mx-auto px-4 py-8">
        <nav className="text-xs text-muted-foreground mb-3">
          <Link href="/" className="hover:underline">
            Beranda
          </Link>{" "}
          /{" "}
          <Link href="/brand" className="hover:underline">
            Brand & Toko
          </Link>{" "}
          / <span>{data?.brand ?? slug}</span>
        </nav>

        <Link
          href="/brand"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Semua brand
        </Link>

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          </div>
        ) : notFound || !data ? (
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold mb-2">Brand tidak ditemukan</h1>
            <p className="text-muted-foreground mb-6">
              Belum ada produk dari brand ini.
            </p>
            <Link
              href="/brand"
              className="text-primary hover:underline font-medium"
            >
              Lihat semua brand →
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-none">
                <Store className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold">{data.brand}</h1>
                <p className="text-sm text-muted-foreground">
                  {data.productCount} produk
                  {data.avgRating > 0 && (
                    <span className="inline-flex items-center gap-0.5 ml-2">
                      ·{" "}
                      <Star className="h-3.5 w-3.5 text-amber-500 fill-current" />
                      Rata-rata {data.avgRating.toFixed(1)}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {data.products.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 4} />
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
