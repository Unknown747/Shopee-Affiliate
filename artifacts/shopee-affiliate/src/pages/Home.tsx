import { Link } from "wouter";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Flame,
  ShieldCheck,
  Truck,
  Tag,
  Star,
  Sparkles,
  Smartphone,
  Shirt,
  Home as HomeIcon,
  Utensils,
  Baby,
  Gamepad2,
  Heart as HeartIcon,
  Package,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SeoHead } from "@/components/SeoHead";
import { ProductCard } from "@/components/ProductCard";
import { setItemListLd, removeJsonLd } from "@/lib/jsonld";
import {
  useListProducts,
  useListCategories,
} from "@workspace/api-client-react";
import type { Product } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { Clock, X } from "lucide-react";

const API_BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

// Map kategori -> ikon (fallback ke Package)
const CATEGORY_ICONS: Record<string, typeof Smartphone> = {
  elektronik: Smartphone,
  electronics: Smartphone,
  hp: Smartphone,
  gadget: Smartphone,
  fashion: Shirt,
  pakaian: Shirt,
  rumah: HomeIcon,
  "rumah tangga": HomeIcon,
  furniture: HomeIcon,
  makanan: Utensils,
  kuliner: Utensils,
  bayi: Baby,
  anak: Baby,
  game: Gamepad2,
  gaming: Gamepad2,
  kesehatan: HeartIcon,
  kecantikan: HeartIcon,
  beauty: HeartIcon,
};

function getCategoryIcon(name: string) {
  const key = name.toLowerCase();
  for (const [k, Icon] of Object.entries(CATEGORY_ICONS)) {
    if (key.includes(k)) return Icon;
  }
  return Package;
}

function TrustStrip() {
  const items = [
    {
      icon: ShieldCheck,
      title: "Review Jujur",
      desc: "Kurasi objektif tanpa endorse",
    },
    {
      icon: Truck,
      title: "Gratis Ongkir",
      desc: "Banyak produk pilihan",
    },
    {
      icon: Tag,
      title: "Harga Terbaik",
      desc: "Diskon terupdate tiap hari",
    },
    {
      icon: Star,
      title: "Produk Pilihan",
      desc: "Rating tinggi & laris",
    },
  ];
  return (
    <section className="py-6 bg-card border-y border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((it) => (
            <div
              key={it.title}
              className="flex items-center gap-3 p-2"
            >
              <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-none">
                <it.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm">{it.title}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {it.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function formatRupiah(n: number) {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `Rp${n}`;
  }
}

function FeaturedPickCard({
  product,
  isLoading,
}: {
  product: Product | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="relative bg-card border border-border rounded-2xl shadow-xl p-6 md:p-8">
        <Skeleton className="h-6 w-40 mb-3" />
        <Skeleton className="aspect-[4/3] w-full rounded-lg mb-4" />
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-4" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="relative bg-card border border-border rounded-2xl shadow-xl p-6 md:p-8 text-center">
        <div className="absolute -top-3 left-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-bold shadow-md">
          <Flame className="h-3 w-3" />
          PILIHAN HARI INI
        </div>
        <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
        <h3 className="font-semibold mb-1">Belum ada produk pilihan</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Produk trending akan muncul di sini setelah ada yang dipublikasikan.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/search">Telusuri Semua Produk</Link>
        </Button>
      </div>
    );
  }

  const hasDiscount =
    product.priceBeforeDisc && product.priceBeforeDisc > product.price;
  const discount = hasDiscount
    ? Math.round(
        ((product.priceBeforeDisc! - product.price) /
          product.priceBeforeDisc!) *
          100,
      )
    : 0;

  return (
    <div className="relative bg-card border border-border rounded-2xl shadow-xl p-6 md:p-8">
      <div className="absolute -top-3 left-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-bold shadow-md">
        <Flame className="h-3 w-3" />
        PILIHAN HARI INI
      </div>

      <Link
        href={`/product/${product.slug}`}
        className="block group"
        aria-label={`Lihat review ${product.name}`}
      >
        <div className="aspect-[4/3] w-full rounded-lg overflow-hidden bg-muted mb-4">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              loading="eager"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              <Package className="h-12 w-12" />
            </div>
          )}
        </div>

        <h3 className="font-semibold text-base md:text-lg leading-snug line-clamp-2 group-hover:text-primary transition-colors mb-2">
          {product.name}
        </h3>

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          {typeof product.ratingStar === "number" && product.ratingStar > 0 && (
            <span className="inline-flex items-center gap-1 text-foreground font-medium">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              {product.ratingStar.toFixed(1)}
            </span>
          )}
          {typeof product.soldCount === "number" && product.soldCount > 0 && (
            <>
              <span>·</span>
              <span>{product.soldCount.toLocaleString("id-ID")} terjual</span>
            </>
          )}
        </div>

        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-2xl font-extrabold text-primary">
            {formatRupiah(product.price)}
          </span>
          {hasDiscount && (
            <>
              <span className="text-sm text-muted-foreground line-through">
                {formatRupiah(product.priceBeforeDisc!)}
              </span>
              <span className="text-xs font-bold text-secondary-foreground bg-secondary px-1.5 py-0.5 rounded">
                -{discount}%
              </span>
            </>
          )}
        </div>
      </Link>

      <Button asChild className="w-full font-semibold" size="lg">
        <Link href={`/product/${product.slug}`}>
          Baca Review Lengkap <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

function RecentlyViewedSection() {
  const { ids, count, clear } = useRecentlyViewed();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ids.length === 0) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/api/products?limit=200`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const all = (data.products as Product[]) ?? [];
        // Preserve recency order from `ids`
        const indexed = new Map(all.map((p) => [p.id, p]));
        const ordered = ids
          .map((id) => indexed.get(id))
          .filter((p): p is Product => Boolean(p));
        setProducts(ordered);
      })
      .catch(() => setProducts([]))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  if (count === 0) return null;
  if (!loading && products.length === 0) return null;

  return (
    <section className="py-10 md:py-14 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
                Baru Dilihat
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                Lanjutkan dari produk yang baru saja Anda buka
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            className="text-muted-foreground hover:text-foreground gap-1.5"
            aria-label="Hapus riwayat baru dilihat"
          >
            <X className="h-3.5 w-3.5" />
            Bersihkan
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
            {products.slice(0, 6).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function Home() {
  const { data: productsData, isLoading: isLoadingProducts } = useListProducts({
    limit: 12,
    sort: "popular",
  });
  const { data: categoriesData, isLoading: isLoadingCategories } =
    useListCategories();
  const [trending, setTrending] = useState<Product[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/stats/trending`)
      .then((r) => r.json())
      .then((d) => setTrending((d.products ?? []).slice(0, 8)))
      .catch(() => setTrending([]))
      .finally(() => setLoadingTrending(false));
  }, []);

  // SEO: ItemList JSON-LD untuk produk populer (max 12)
  useEffect(() => {
    const list = productsData?.products ?? [];
    if (list.length === 0) return;
    setItemListLd(
      "ld-itemlist-home",
      list.slice(0, 12).map((p) => ({
        slug: p.slug,
        name: p.name,
        imageUrl: p.imageUrl,
      })),
    );
    return () => removeJsonLd("ld-itemlist-home");
  }, [productsData]);

  return (
    <Layout>
      <SeoHead
        title="Beranda — Rekomendasi Produk Shopee Terbaik"
        description="Rekomendasi produk Shopee terbaik yang dikurasi objektif: handphone, fashion, peralatan rumah, kecantikan, dan banyak lagi. Update harga & promo gratis ongkir tiap hari."
        type="website"
      />
      {/* HERO ============================================================ */}
      <section className="relative overflow-hidden">
        {/* Background gradient + decorative blobs */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-background to-orange-50/40 dark:from-orange-950/20 dark:via-background dark:to-orange-950/10" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-secondary/20 blur-3xl" />

        <div className="relative container mx-auto px-4 py-12 md:py-20">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            {/* Left: copy + CTA */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-5">
                <Sparkles className="h-3.5 w-3.5" />
                Platform Rekomendasi #1 Indonesia
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-5">
                Belanja <span className="text-primary">Lebih Cerdas</span>
                <br />
                di Shopee
              </h1>
              <p className="text-base md:text-lg text-muted-foreground mb-7 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                Ribuan produk pilihan, review jujur, dan harga terupdate tiap hari.
                Hemat waktu, hemat uang, belanja tanpa ragu.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-8">
                <Button size="lg" asChild className="font-semibold">
                  <Link href="/search">
                    Mulai Belanja <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="font-semibold">
                  <Link href="/trending">
                    <Flame className="mr-2 h-4 w-4" /> Lihat Trending
                  </Link>
                </Button>
              </div>

              {/* Mini stats */}
              <div className="flex items-center gap-6 justify-center lg:justify-start text-sm">
                <div>
                  <div className="text-2xl font-extrabold text-foreground">
                    1000+
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Produk Pilihan
                  </div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <div className="text-2xl font-extrabold text-foreground">
                    50K+
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Pengunjung Bulanan
                  </div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <div className="text-2xl font-extrabold text-foreground">
                    4.8
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Rating Rata-rata
                  </div>
                </div>
              </div>
            </div>

            {/* Right: top pick / featured product card */}
            <div className="relative">
              <FeaturedPickCard
                product={trending[0]}
                isLoading={loadingTrending}
              />
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP ===================================================== */}
      <TrustStrip />

      {/* CATEGORIES ====================================================== */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Kategori Pilihan
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Jelajahi berdasarkan kategori favorit Anda
              </p>
            </div>
            <Button variant="ghost" asChild className="font-semibold">
              <Link href="/search">
                Lihat Semua <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {isLoadingCategories
              ? Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))
              : categoriesData?.slice(0, 8).map((cat) => {
                  const Icon = getCategoryIcon(cat.category);
                  return (
                    <Link
                      key={cat.category}
                      href={`/search?category=${encodeURIComponent(cat.category)}`}
                      className="group"
                    >
                      <div className="bg-card border border-border rounded-xl p-3 text-center h-full flex flex-col items-center justify-center gap-2 hover:border-primary hover:-translate-y-0.5 hover:shadow-md transition-all">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center group-hover:from-primary group-hover:to-orange-600 group-hover:text-primary-foreground transition-all">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="font-semibold text-xs capitalize line-clamp-1">
                          {cat.category}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {cat.count} produk
                        </span>
                      </div>
                    </Link>
                  );
                })}
          </div>
        </div>
      </section>

      {/* TRENDING / FLASH SALE STYLE ==================================== */}
      <section className="py-10 md:py-14 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5">
        <div className="container mx-auto px-4">
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            {/* Strip header */}
            <div className="bg-gradient-to-r from-primary to-orange-600 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                  <Flame className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
                    Trending Minggu Ini
                  </h2>
                  <p className="text-xs text-white/80">
                    Paling banyak dilihat & diklik pengunjung
                  </p>
                </div>
              </div>
              <Button
                asChild
                className="bg-white text-primary hover:bg-white/90 font-bold"
              >
                <Link href="/trending">
                  Lihat Semua <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Grid */}
            <div className="p-4 md:p-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-3 md:gap-4">
                {loadingTrending ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton
                      key={i}
                      className="aspect-[3/4] rounded-xl"
                    />
                  ))
                ) : trending.length === 0 ? (
                  <p className="col-span-full text-sm text-muted-foreground text-center py-8">
                    Belum ada data trending. Lihat{" "}
                    <Link href="/search" className="text-primary underline">
                      semua produk
                    </Link>
                    .
                  </p>
                ) : (
                  trending.slice(0, 4).map((p, i) => (
                    <div key={p.id} className="relative">
                      <div className="absolute -top-2 -left-2 z-10">
                        <div
                          className={`h-9 w-9 rounded-full text-sm font-extrabold flex items-center justify-center shadow-lg text-white ${
                            i === 0
                              ? "bg-gradient-to-br from-yellow-400 to-yellow-600"
                              : i === 1
                                ? "bg-gradient-to-br from-slate-400 to-slate-600"
                                : i === 2
                                  ? "bg-gradient-to-br from-orange-400 to-orange-700"
                                  : "bg-gradient-to-br from-primary to-orange-600"
                          }`}
                        >
                          #{i + 1}
                        </div>
                      </div>
                      <ProductCard product={p} priority={i < 4} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RECENTLY VIEWED ================================================== */}
      <RecentlyViewedSection />

      {/* RECOMMENDED ===================================================== */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-secondary" />
                Rekomendasi Pilihan
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Produk pilihan tim kurasi yang wajib Anda lihat
              </p>
            </div>
            <Button variant="outline" asChild className="font-semibold">
              <Link href="/search">
                Eksplorasi Semua <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
            {isLoadingProducts
              ? Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
                ))
              : productsData?.products.map((product, idx) => (
                  <ProductCard key={product.id} product={product} priority={idx < 4} />
                ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA ======================================================= */}
      <section className="py-16 bg-gradient-to-r from-primary to-orange-600 text-primary-foreground">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-3 tracking-tight">
            Siap Belanja Lebih Hemat?
          </h2>
          <p className="text-base md:text-lg opacity-90 mb-7">
            Mulai dari menjelajahi ribuan rekomendasi produk Shopee terbaik
            yang sudah kami kurasi untuk Anda.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              asChild
              className="bg-white text-primary hover:bg-white/90 font-bold"
            >
              <Link href="/search">
                Telusuri Produk <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="bg-transparent text-white border-white/40 hover:bg-white/10 hover:text-white font-bold"
            >
              <Link href="/about">Tentang Kami</Link>
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}
