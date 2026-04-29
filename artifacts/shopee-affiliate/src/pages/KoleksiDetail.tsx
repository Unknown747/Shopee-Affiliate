import { Link, useParams } from "wouter";
import { useEffect, useState } from "react";
import { Tag, ArrowLeft } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SeoHead } from "@/components/SeoHead";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  setItemListLd,
  setBreadcrumbLd,
  removeJsonLd,
} from "@/lib/jsonld";
import type { Product } from "@workspace/api-client-react";

const API_BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

type Response = {
  tag: string;
  slug: string;
  productCount: number;
  products: Product[];
};

export default function KoleksiDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";

  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    fetch(`${API_BASE}/api/koleksi/${encodeURIComponent(slug)}`)
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
    setItemListLd("ld-koleksi-list", data.products);
    setBreadcrumbLd("ld-breadcrumb-koleksi", [
      { name: "Beranda", path: "/" },
      { name: "Koleksi Tematik", path: "/koleksi" },
      { name: data.tag, path: `/koleksi/${data.slug}` },
    ]);
    return () => {
      removeJsonLd("ld-koleksi-list");
      removeJsonLd("ld-breadcrumb-koleksi");
    };
  }, [data]);

  const title = data
    ? `Koleksi ${data.tag} — Pilihan Produk Terbaik`
    : "Koleksi";
  const desc = data
    ? `Eksplor ${data.productCount} produk dalam koleksi "${data.tag}" — dipilih dari katalog Shopee dengan rating dan minat pembaca terbaik.`
    : undefined;

  return (
    <Layout>
      <SeoHead
        title={title}
        description={desc}
        path={`/koleksi/${slug}`}
        noindex={notFound}
      />
      <div className="container mx-auto px-4 py-8">
        <nav className="text-xs text-muted-foreground mb-3">
          <Link href="/" className="hover:underline">
            Beranda
          </Link>{" "}
          /{" "}
          <Link href="/koleksi" className="hover:underline">
            Koleksi Tematik
          </Link>{" "}
          / <span className="capitalize">{data?.tag ?? slug}</span>
        </nav>

        <Link
          href="/koleksi"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Semua koleksi
        </Link>

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-10 w-2/3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          </div>
        ) : notFound || !data ? (
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold mb-2">Koleksi tidak ditemukan</h1>
            <p className="text-muted-foreground mb-6">
              Tag ini belum punya cukup produk untuk dijadikan koleksi.
            </p>
            <Link
              href="/koleksi"
              className="text-primary hover:underline font-medium"
            >
              Lihat semua koleksi →
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-2 capitalize">
                <Tag className="h-7 w-7 text-primary flex-none" />
                Koleksi: {data.tag}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {data.productCount} produk diurutkan dari rating, klik, dan
                minat pembaca lain.
              </p>
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
