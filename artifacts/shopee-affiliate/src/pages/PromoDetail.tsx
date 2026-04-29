import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { Sparkles, Calendar, ArrowLeft } from "lucide-react";
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

type Promo = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  bannerImage: string | null;
  tag: string | null;
  ctaText: string | null;
  startDate: string | null;
  endDate: string | null;
};

function fmtDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function PromoDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";

  const [data, setData] = useState<{ promo: Promo; products: Product[] } | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    fetch(`${API_BASE}/api/promos/${encodeURIComponent(slug)}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!data) return;
    const { promo, products } = data;
    if (products.length > 0) {
      setItemListLd("ld-promo-list", products);
    }
    setBreadcrumbLd("ld-breadcrumb-promo", [
      { name: "Beranda", path: "/" },
      { name: "Promo & Event", path: "/promo" },
      { name: promo.title, path: `/promo/${promo.slug}` },
    ]);
    setJsonLd("ld-sale-event", {
      "@context": "https://schema.org",
      "@type": "SaleEvent",
      name: promo.title,
      description: promo.description ?? undefined,
      image: promo.bannerImage ?? undefined,
      startDate: promo.startDate ?? undefined,
      endDate: promo.endDate ?? undefined,
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
      location: {
        "@type": "VirtualLocation",
        url: `https://shopee.co.id/`,
      },
    });
    return () => {
      removeJsonLd("ld-promo-list");
      removeJsonLd("ld-breadcrumb-promo");
      removeJsonLd("ld-sale-event");
    };
  }, [data]);

  return (
    <Layout>
      <SeoHead
        title={data ? `${data.promo.title} — Promo Shopee` : "Promo"}
        description={data?.promo.description ?? undefined}
        path={`/promo/${slug}`}
        type="article"
        image={data?.promo.bannerImage ?? undefined}
        noindex={notFound}
      />
      <div className="container mx-auto px-4 py-8">
        <nav className="text-xs text-muted-foreground mb-3">
          <Link href="/" className="hover:underline">
            Beranda
          </Link>{" "}
          /{" "}
          <Link href="/promo" className="hover:underline">
            Promo & Event
          </Link>{" "}
          / <span>{data?.promo.title ?? slug}</span>
        </nav>

        <Link
          href="/promo"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Semua promo
        </Link>

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-8 w-2/3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          </div>
        ) : notFound || !data ? (
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold mb-2">Promo tidak ditemukan</h1>
            <p className="text-muted-foreground mb-6">
              Promo mungkin sudah berakhir atau URL salah.
            </p>
            <Link
              href="/promo"
              className="text-primary hover:underline font-medium"
            >
              Lihat semua promo →
            </Link>
          </div>
        ) : (
          <>
            {data.promo.bannerImage ? (
              <img
                src={data.promo.bannerImage}
                alt={data.promo.title}
                className="w-full aspect-[16/9] md:aspect-[3/1] object-cover rounded-xl mb-6"
              />
            ) : (
              <div className="w-full aspect-[16/9] md:aspect-[3/1] rounded-xl bg-gradient-to-br from-primary via-orange-500 to-amber-400 mb-6 flex items-center justify-center">
                <Sparkles className="h-24 w-24 text-white/60" />
              </div>
            )}

            <header className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-2">
                <Sparkles className="h-7 w-7 text-primary flex-none" />
                {data.promo.title}
              </h1>
              {data.promo.description && (
                <p className="text-base text-muted-foreground mt-3 leading-relaxed">
                  {data.promo.description}
                </p>
              )}
              {(data.promo.startDate || data.promo.endDate) && (
                <p className="text-xs text-muted-foreground mt-3 inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Periode: {data.promo.startDate && fmtDate(data.promo.startDate)}
                  {data.promo.startDate && data.promo.endDate && " — "}
                  {data.promo.endDate && fmtDate(data.promo.endDate)}
                </p>
              )}
            </header>

            <h2 className="text-xl font-bold mb-4">
              {data.products.length} Produk dalam promo ini
            </h2>

            {data.products.length === 0 ? (
              <p className="text-center text-muted-foreground py-12 border border-dashed border-border rounded-xl">
                Belum ada produk yang masuk promo ini. Cek kembali nanti.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {data.products.map((p, i) => (
                  <ProductCard key={p.id} product={p} priority={i < 4} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
