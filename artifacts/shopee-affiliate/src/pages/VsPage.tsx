import { Link, useParams } from "wouter";
import { useEffect, useState } from "react";
import {
  GitCompare,
  ArrowRight,
  Star,
  ShoppingCart,
  Trophy,
  TrendingDown,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SeoHead } from "@/components/SeoHead";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatIdr, formatNumber } from "@/lib/format";
import {
  setBreadcrumbLd,
  setJsonLd,
  removeJsonLd,
} from "@/lib/jsonld";
import type { Product } from "@workspace/api-client-react";

const API_BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

type Pair = { a: Product; b: Product };

function parsePairSlug(pair: string): { slugA: string; slugB: string } | null {
  const parts = pair.split("-vs-");
  if (parts.length < 2) return null;
  // Support multi-word slugs by treating the FIRST "-vs-" as separator
  const slugA = parts[0]!;
  const slugB = parts.slice(1).join("-vs-");
  if (!slugA || !slugB) return null;
  return { slugA, slugB };
}

function bestOf<T>(items: T[], pick: (t: T) => number): T | null {
  if (items.length === 0) return null;
  return items.reduce((best, cur) => (pick(cur) > pick(best) ? cur : best));
}

export default function VsPage() {
  const params = useParams<{ pair: string }>();
  const pairSlug = params.pair ?? "";
  const parsed = parsePairSlug(pairSlug);

  const [data, setData] = useState<Pair | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!parsed) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotFound(false);
    fetch(
      `${API_BASE}/api/vs/${encodeURIComponent(parsed.slugA)}/${encodeURIComponent(parsed.slugB)}`,
    )
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((d: Pair | null) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [pairSlug]);

  useEffect(() => {
    if (!data) return;
    const origin = window.location.origin;
    const canonical = `${origin}/vs/${pairSlug}`;
    setBreadcrumbLd("ld-breadcrumb-vs", [
      { name: "Beranda", path: "/" },
      { name: "Bandingkan", path: "/vs" },
      { name: `${data.a.name} vs ${data.b.name}`, path: `/vs/${pairSlug}` },
    ]);
    setJsonLd("ld-vs-article", {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: `${data.a.name} vs ${data.b.name} — Perbandingan Spesifikasi & Harga`,
      mainEntityOfPage: canonical,
      about: [
        { "@type": "Product", name: data.a.name, image: data.a.imageUrl },
        { "@type": "Product", name: data.b.name, image: data.b.imageUrl },
      ],
    });
    return () => {
      removeJsonLd("ld-breadcrumb-vs");
      removeJsonLd("ld-vs-article");
    };
  }, [data, pairSlug]);

  const title = data
    ? `${data.a.name} vs ${data.b.name} — Mana yang Lebih Worth?`
    : "Bandingkan Produk";
  const desc = data
    ? `Bandingkan ${data.a.name} vs ${data.b.name}: harga, rating, jumlah terjual, kelebihan & kekurangan masing-masing.`
    : undefined;

  const cheapest =
    data && bestOf([data.a, data.b], (p) => -p.price);
  const highestRated =
    data && bestOf([data.a, data.b], (p) => p.ratingStar ?? 0);
  const mostSold =
    data && bestOf([data.a, data.b], (p) => p.soldCount ?? 0);

  return (
    <Layout>
      <SeoHead title={title} description={desc} noindex={notFound} />
      <div className="container mx-auto px-4 py-8">
        <nav className="text-xs text-muted-foreground mb-4">
          <Link href="/" className="hover:underline">
            Beranda
          </Link>{" "}
          / <span>Bandingkan</span>
          {data && (
            <>
              {" "}
              /{" "}
              <span className="line-clamp-1">
                {data.a.name} vs {data.b.name}
              </span>
            </>
          )}
        </nav>

        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <GitCompare className="h-7 w-7 text-primary flex-none" />
            <span>Perbandingan Produk</span>
          </h1>
          {data && (
            <p className="text-sm text-muted-foreground mt-2">
              Pilih mana yang lebih cocok dari{" "}
              <strong>{data.a.name}</strong> vs <strong>{data.b.name}</strong>{" "}
              berdasarkan harga, rating, dan popularitas.
            </p>
          )}
        </div>

        {loading ? (
          <Skeleton className="h-96 w-full" />
        ) : notFound || !data ? (
          <div className="text-center py-20 border border-dashed border-border rounded-xl">
            <GitCompare className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-lg font-medium mb-1">
              Perbandingan tidak ditemukan
            </p>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Format URL: <code>/vs/produk-a-vs-produk-b</code>. Pastikan kedua
              slug produk valid dan dipisah dengan <code>-vs-</code>.
            </p>
            <Button asChild>
              <Link href="/search">
                Eksplorasi Produk <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-sm font-medium text-muted-foreground p-3 w-32">
                    Spesifikasi
                  </th>
                  {[data.a, data.b].map((p) => (
                    <th key={p.id} className="p-3 align-top min-w-[220px]">
                      <Link href={`/product/${p.slug}`}>
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          loading="lazy"
                          className="w-full aspect-square object-cover rounded-lg border border-border hover:border-primary transition-colors"
                        />
                        <div className="text-sm font-semibold mt-2 line-clamp-2 text-left hover:text-primary transition-colors">
                          {p.name}
                        </div>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-t border-border">
                  <td className="p-3 font-medium text-muted-foreground">Harga</td>
                  {[data.a, data.b].map((p) => (
                    <td key={p.id} className="p-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-bold text-primary">
                          {formatIdr(p.price)}
                        </span>
                        {cheapest?.id === p.id && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Trophy className="h-3 w-3" /> Termurah
                          </Badge>
                        )}
                      </div>
                      {p.priceBeforeDisc && p.priceBeforeDisc > p.price && (
                        <div className="text-xs text-muted-foreground line-through">
                          {formatIdr(p.priceBeforeDisc)}
                        </div>
                      )}
                      {(p as any).oldPrice7d && (p as any).oldPrice7d > p.price && (
                        <div className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                          <TrendingDown className="h-3 w-3" /> Turun dari{" "}
                          {formatIdr((p as any).oldPrice7d)}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-border">
                  <td className="p-3 font-medium text-muted-foreground">Rating</td>
                  {[data.a, data.b].map((p) => (
                    <td key={p.id} className="p-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-amber-500 fill-current" />
                          {p.ratingStar?.toFixed(1) ?? "-"}
                        </span>
                        {highestRated?.id === p.id && (p.ratingStar ?? 0) > 0 && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Trophy className="h-3 w-3" /> Tertinggi
                          </Badge>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-border">
                  <td className="p-3 font-medium text-muted-foreground">Terjual</td>
                  {[data.a, data.b].map((p) => (
                    <td key={p.id} className="p-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{formatNumber(p.soldCount ?? 0)}</span>
                        {mostSold?.id === p.id && (p.soldCount ?? 0) > 0 && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Trophy className="h-3 w-3" /> Paling Laris
                          </Badge>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-border">
                  <td className="p-3 font-medium text-muted-foreground">Toko</td>
                  {[data.a, data.b].map((p) => (
                    <td key={p.id} className="p-3 text-xs">
                      {p.shopName ?? "-"}
                      {p.shopRating != null && (
                        <div className="text-muted-foreground">
                          ★ {p.shopRating.toFixed(1)}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-border">
                  <td className="p-3 font-medium text-muted-foreground">
                    Kategori
                  </td>
                  {[data.a, data.b].map((p) => (
                    <td key={p.id} className="p-3 text-xs">
                      {p.category ?? "-"}
                    </td>
                  ))}
                </tr>
                {(data.a.pros?.length || data.b.pros?.length) && (
                  <tr className="border-t border-border align-top">
                    <td className="p-3 font-medium text-muted-foreground">
                      Kelebihan
                    </td>
                    {[data.a, data.b].map((p) => (
                      <td key={p.id} className="p-3 text-xs">
                        {p.pros?.length ? (
                          <ul className="space-y-1 list-disc pl-4">
                            {p.pros.slice(0, 4).map((pro, i) => (
                              <li key={i}>{pro}</li>
                            ))}
                          </ul>
                        ) : (
                          "-"
                        )}
                      </td>
                    ))}
                  </tr>
                )}
                {(data.a.cons?.length || data.b.cons?.length) && (
                  <tr className="border-t border-border align-top">
                    <td className="p-3 font-medium text-muted-foreground">
                      Kekurangan
                    </td>
                    {[data.a, data.b].map((p) => (
                      <td key={p.id} className="p-3 text-xs">
                        {p.cons?.length ? (
                          <ul className="space-y-1 list-disc pl-4">
                            {p.cons.slice(0, 4).map((con, i) => (
                              <li key={i}>{con}</li>
                            ))}
                          </ul>
                        ) : (
                          "-"
                        )}
                      </td>
                    ))}
                  </tr>
                )}
                <tr className="border-t border-border">
                  <td className="p-3"></td>
                  {[data.a, data.b].map((p) => (
                    <td key={p.id} className="p-3">
                      <Button asChild className="w-full gap-2" size="sm">
                        <a
                          href={p.affiliateLink}
                          target="_blank"
                          rel="sponsored nofollow noopener noreferrer"
                        >
                          <ShoppingCart className="h-4 w-4" /> Beli {p.name.split(" ").slice(0, 2).join(" ")}
                        </a>
                      </Button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>

            <p className="text-xs text-muted-foreground mt-6 text-center">
              Disclosure: link merupakan affiliate Shopee — kami dapat komisi
              tanpa biaya tambahan untuk Anda.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
