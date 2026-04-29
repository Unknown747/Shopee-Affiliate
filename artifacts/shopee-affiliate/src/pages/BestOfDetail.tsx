import { Link, useParams } from "wouter";
import { useEffect, useState } from "react";
import { Trophy, ArrowLeft, Star } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SeoHead } from "@/components/SeoHead";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { setItemListLd, setBreadcrumbLd, removeJsonLd } from "@/lib/jsonld";
import type { Product } from "@workspace/api-client-react";

const API_BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

type Response = {
  category: string;
  slug: string;
  total: number;
  products: Product[];
};

export default function BestOfDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";

  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    fetch(`${API_BASE}/api/best-of/${encodeURIComponent(slug)}`)
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
    if (!data || data.products.length === 0) return;
    setItemListLd("ld-bestof-list", data.products);
    setBreadcrumbLd("ld-breadcrumb-bestof", [
      { name: "Beranda", path: "/" },
      { name: "Produk Terbaik", path: "/terbaik" },
      { name: data.category, path: `/terbaik/${data.slug}` },
    ]);
    return () => {
      removeJsonLd("ld-bestof-list");
      removeJsonLd("ld-breadcrumb-bestof");
    };
  }, [data]);

  const title = data
    ? `10 ${data.category} Terbaik — Rekomendasi & Harga`
    : "Produk Terbaik";
  const desc = data
    ? `Daftar 10 ${data.category.toLowerCase()} terbaik di Shopee, dipilih berdasarkan rating, jumlah terjual, dan minat pembaca. Cek harga & review sebelum beli.`
    : undefined;

  return (
    <Layout>
      <SeoHead
        title={title}
        description={desc}
        path={`/terbaik/${slug}`}
        noindex={notFound}
      />
      <div className="container mx-auto px-4 py-8">
        <nav className="text-xs text-muted-foreground mb-3">
          <Link href="/" className="hover:underline">
            Beranda
          </Link>{" "}
          /{" "}
          <Link href="/terbaik" className="hover:underline">
            Produk Terbaik
          </Link>{" "}
          / <span>{data?.category ?? slug}</span>
        </nav>

        <Link
          href="/terbaik"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Semua kategori
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
            <h1 className="text-2xl font-bold mb-2">Kategori tidak ditemukan</h1>
            <p className="text-muted-foreground mb-6">
              Belum ada ranking untuk kategori ini.
            </p>
            <Link
              href="/terbaik"
              className="text-primary hover:underline font-medium"
            >
              Lihat semua kategori →
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-2">
                <Trophy className="h-8 w-8 text-amber-500 flex-none" />
                <span>10 {data.category} Terbaik</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
                Daftar berikut diurutkan secara otomatis berdasarkan kombinasi
                rating bintang, jumlah terjual, dan minat pembaca lain dalam
                kategori <strong>{data.category}</strong>. Update setiap kali
                ada perubahan data.
              </p>
              <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-amber-500" /> Rating
                </span>
                <span>·</span>
                <span>Penjualan</span>
                <span>·</span>
                <span>Minat pembaca</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {data.products.map((p, i) => (
                <div key={p.id} className="relative">
                  <span
                    className={`absolute -top-2 -left-2 z-10 h-9 w-9 rounded-full text-sm font-bold flex items-center justify-center shadow ${
                      i === 0
                        ? "bg-amber-500 text-white"
                        : i === 1
                          ? "bg-slate-400 text-white"
                          : i === 2
                            ? "bg-amber-700 text-white"
                            : "bg-primary text-primary-foreground"
                    }`}
                    aria-label={`Peringkat ${i + 1}`}
                  >
                    #{i + 1}
                  </span>
                  <ProductCard product={p} priority={i < 4} />
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground mt-8 text-center">
              Disclosure: link produk merupakan affiliate link Shopee. Harga &
              stok bisa berubah sewaktu-waktu.
            </p>
          </>
        )}
      </div>
    </Layout>
  );
}
