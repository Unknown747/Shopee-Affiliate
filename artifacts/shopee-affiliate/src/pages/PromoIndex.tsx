import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Sparkles, Calendar, ArrowRight } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SeoHead } from "@/components/SeoHead";
import { Skeleton } from "@/components/ui/skeleton";
import { setBreadcrumbLd, removeJsonLd } from "@/lib/jsonld";

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
    month: "short",
    year: "numeric",
  });
}

export default function PromoIndex() {
  const [items, setItems] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/promos`)
      .then((r) => r.json())
      .then((d) => setItems(d.promos ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setBreadcrumbLd("ld-breadcrumb-promo", [
      { name: "Beranda", path: "/" },
      { name: "Promo & Event", path: "/promo" },
    ]);
    return () => removeJsonLd("ld-breadcrumb-promo");
  }, []);

  return (
    <Layout>
      <SeoHead
        title="Promo & Event Belanja"
        description="Daftar promo Shopee aktif: flash sale, harbolnas, voucher. Update tiap minggu — jangan sampai kelewat."
        path="/promo"
      />
      <div className="container mx-auto px-4 py-8">
        <nav className="text-xs text-muted-foreground mb-3">
          <Link href="/" className="hover:underline">
            Beranda
          </Link>{" "}
          / <span>Promo & Event</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            Promo & Event
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Promo Shopee aktif yang sedang kami pantau. Klik untuk melihat
            produk-produk yang masuk dalam tiap promo.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-56 w-full rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-lg font-medium mb-1">
              Tidak ada promo aktif saat ini
            </p>
            <p className="text-sm text-muted-foreground">
              Cek kembali nanti — promo baru muncul tiap minggu.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.map((p) => (
              <Link
                key={p.id}
                href={`/promo/${p.slug}`}
                className="group relative block rounded-xl overflow-hidden border border-border bg-card hover:shadow-lg hover:border-primary transition-all"
              >
                {p.bannerImage ? (
                  <div className="aspect-[16/9] overflow-hidden bg-muted">
                    <img
                      src={p.bannerImage}
                      alt={p.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-[16/9] bg-gradient-to-br from-primary via-orange-500 to-amber-400 flex items-center justify-center">
                    <Sparkles className="h-16 w-16 text-white/60" />
                  </div>
                )}
                <div className="p-5">
                  <h2 className="font-bold text-xl leading-tight group-hover:text-primary transition-colors">
                    {p.title}
                  </h2>
                  {p.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {p.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-4">
                    {(p.startDate || p.endDate) && (
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {p.startDate && fmtDate(p.startDate)}
                        {p.startDate && p.endDate && " — "}
                        {p.endDate && fmtDate(p.endDate)}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-primary inline-flex items-center gap-1 ml-auto">
                      {p.ctaText ?? "Lihat Produk"}{" "}
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
