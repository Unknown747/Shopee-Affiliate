import { useParams, Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import {
  useGetProductBySlug,
  useListProducts,
  useTrackProductClick,
} from "@workspace/api-client-react";
import { formatIdr, formatNumber, getDiscountPercent } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ProductCard } from "@/components/ProductCard";
import {
  Star,
  ShoppingCart,
  CheckCircle2,
  XCircle,
  Eye,
  MousePointerClick,
  Share2,
  Copy,
  Check,
  Store,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";

type RelatedProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  priceBeforeDisc?: number | null;
  ratingStar?: number | null;
  imageUrl: string;
};

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function setJsonLd(id: string, data: Record<string, unknown>) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function removeJsonLd(id: string) {
  document.getElementById(id)?.remove();
}

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const { data: product, isLoading } = useGetProductBySlug(slug ?? "");
  const { data: relatedData } = useListProducts({
    category: product?.category ?? undefined,
    limit: 8,
  });
  const trackClick = useTrackProductClick();

  const relatedProducts = useMemo(
    () => relatedData?.products.filter((p) => p.id !== product?.id) ?? [],
    [relatedData?.products, product?.id],
  );
  const comparisonProducts: RelatedProduct[] = useMemo(
    () => relatedProducts.slice(0, 3),
    [relatedProducts],
  );
  const cheaperAlternative = useMemo(
    () =>
      relatedProducts
        .filter((p) => product && p.price < product.price)
        .sort((a, b) => a.price - b.price)[0],
    [relatedProducts, product],
  );

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const set = new Set<string>();
    set.add(product.imageUrl);
    (product.images ?? []).forEach((img) => set.add(img));
    return Array.from(set);
  }, [product]);

  const heroImage = activeImage || product?.imageUrl || "";

  // SEO: title, meta tags, JSON-LD structured data
  useEffect(() => {
    if (!product) return;
    const url = window.location.href;
    const title =
      product.metaTitle ||
      `Review ${product.name} - Harga & Kelebihan | Shopee Affiliate`;
    document.title = title;

    const desc =
      product.metaDesc ||
      `Review lengkap ${product.name}: pengalaman pakai, kelebihan, kekurangan, FAQ, dan harga ${formatIdr(product.price)}. Cek sebelum beli di Shopee!`;

    setMeta("description", desc);
    setMeta("keywords", (product.tags ?? []).join(", "));

    // Open Graph
    setMeta("og:title", title, "property");
    setMeta("og:description", desc, "property");
    setMeta("og:image", product.imageUrl, "property");
    setMeta("og:type", "product", "property");
    setMeta("og:url", url, "property");

    // Twitter
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", desc);
    setMeta("twitter:image", product.imageUrl);

    setCanonical(url);

    // JSON-LD: Product
    const productLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: desc,
      image: galleryImages.length > 0 ? galleryImages : [product.imageUrl],
      sku: product.shopeeId,
      ...(product.category ? { category: product.category } : {}),
      ...(product.shopName
        ? { brand: { "@type": "Brand", name: product.shopName } }
        : {}),
      offers: {
        "@type": "Offer",
        url,
        priceCurrency: "IDR",
        price: product.price,
        availability: "https://schema.org/InStock",
        ...(product.shopName
          ? { seller: { "@type": "Organization", name: product.shopName } }
          : {}),
      },
      ...(product.ratingStar
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: product.ratingStar,
              reviewCount: Math.max(product.soldCount ?? 10, 10),
              bestRating: 5,
              worstRating: 1,
            },
          }
        : {}),
    };
    setJsonLd("ld-product", productLd);

    // JSON-LD: BreadcrumbList
    const crumbs: Array<{ name: string; item: string }> = [
      { name: "Beranda", item: window.location.origin + "/" },
    ];
    if (product.category) {
      crumbs.push({
        name: product.category,
        item: `${window.location.origin}/search?category=${encodeURIComponent(product.category)}`,
      });
    }
    crumbs.push({ name: product.name, item: url });
    setJsonLd("ld-breadcrumb", {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbs.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        item: c.item,
      })),
    });

    // JSON-LD: FAQ
    if (product.faq && product.faq.length > 0) {
      setJsonLd("ld-faq", {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: product.faq.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      });
    } else {
      removeJsonLd("ld-faq");
    }

    return () => {
      removeJsonLd("ld-product");
      removeJsonLd("ld-breadcrumb");
      removeJsonLd("ld-faq");
    };
  }, [product, galleryImages]);

  const handleBuyClick = () => {
    if (product) {
      trackClick.mutate({
        id: product.id,
        data: { referer: window.location.href },
      });
    }
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = `Cek review ${product?.name} di Shopee!`;
    const shareUrls: Record<string, string> = {
      wa: `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      fb: `https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    };
    window.open(shareUrls[platform], "_blank", "noopener,noreferrer");
  };

  const handleCopyAffiliate = async () => {
    if (!product) return;
    try {
      await navigator.clipboard.writeText(product.affiliateLink);
      setLinkCopied(true);
      toast({
        title: "Link berhasil disalin!",
        description: "Tautan afiliasi sudah ada di clipboard Anda.",
      });
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      toast({
        title: "Gagal menyalin link",
        description: "Silakan salin manual dari address bar.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-10 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-10">
            <Skeleton className="aspect-square rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Produk tidak ditemukan</h1>
          <Button asChild>
            <Link href="/">Kembali ke Beranda</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const discount = getDiscountPercent(product.price, product.priceBeforeDisc ?? 0);
  const altText = product.category
    ? `${product.name} - ${product.category} di Shopee`
    : `${product.name} di Shopee`;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap"
        >
          <Link href="/" className="hover:text-primary transition-colors">
            Beranda
          </Link>
          <span>/</span>
          {product.category && (
            <>
              <Link
                href={`/search?category=${encodeURIComponent(product.category)}`}
                className="hover:text-primary transition-colors"
              >
                {product.category}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-foreground line-clamp-1">{product.name}</span>
        </nav>

        {/* Product Hero */}
        <div className="grid md:grid-cols-2 gap-10 mb-12">
          <div>
            <div className="relative">
              <div className="aspect-square overflow-hidden rounded-xl bg-muted">
                <img
                  src={heroImage}
                  alt={altText}
                  loading="eager"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
              {discount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute top-4 right-4 text-base font-bold px-3 py-1"
                >
                  -{discount}%
                </Badge>
              )}
            </div>
            {galleryImages.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {galleryImages.slice(0, 5).map((img, i) => {
                  const isActive = (activeImage || product.imageUrl) === img;
                  return (
                    <button
                      key={img + i}
                      type="button"
                      onClick={() => setActiveImage(img)}
                      aria-label={`Lihat foto ${i + 1} dari ${product.name}`}
                      className={`aspect-square overflow-hidden rounded-md border-2 transition ${
                        isActive
                          ? "border-primary"
                          : "border-transparent hover:border-muted-foreground/30"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${product.name} - sudut ${i + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div>
              {product.category && (
                <Badge variant="outline" className="mb-2">
                  {product.category}
                </Badge>
              )}
              <h1 className="text-2xl md:text-3xl font-bold leading-tight">
                {product.name}
              </h1>
            </div>

            {product.shopName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <Store className="h-4 w-4" />
                <span>Toko</span>
                <span className="font-medium text-foreground">
                  {product.shopName}
                </span>
                {product.shopRating && (
                  <Badge variant="outline" className="gap-1" title="Rating Toko">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {product.shopRating.toFixed(1)} <span className="text-xs">(toko)</span>
                  </Badge>
                )}
              </div>
            )}

            {product.ratingStar && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1" aria-label={`Rating produk ${product.ratingStar.toFixed(1)} dari 5`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.round(product.ratingStar!)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                <span className="font-semibold">
                  {product.ratingStar.toFixed(1)}
                </span>
                <span className="text-sm text-muted-foreground">rating produk</span>
                {product.soldCount && (
                  <span className="text-sm text-muted-foreground">
                    · {formatNumber(product.soldCount)} terjual
                  </span>
                )}
              </div>
            )}

            <div>
              {product.priceBeforeDisc && discount > 0 && (
                <div className="text-muted-foreground line-through text-lg">
                  {formatIdr(product.priceBeforeDisc)}
                </div>
              )}
              <div className="text-4xl font-bold text-primary">
                {formatIdr(product.price)}
              </div>
              {product.commission && (
                <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Komisi: {formatIdr(product.commission)} (
                  {product.commissionRate?.toFixed(1)}%)
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" /> {formatNumber(product.viewCount)} dilihat
              </span>
              <span className="flex items-center gap-1">
                <MousePointerClick className="h-4 w-4" />{" "}
                {formatNumber(product.clickCount)} diklik
              </span>
            </div>

            <Button
              size="lg"
              className="w-full text-base gap-2 font-semibold h-14"
              asChild
              onClick={handleBuyClick}
            >
              <a
                href={product.affiliateLink}
                target="_blank"
                rel="sponsored nofollow noopener noreferrer"
              >
                <ShoppingCart className="h-5 w-5" />
                Beli di Shopee
              </a>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={handleCopyAffiliate}
            >
              {linkCopied ? (
                <>
                  <Check className="h-4 w-4" /> Link Tersalin!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Salin Link Afiliasi
                </>
              )}
            </Button>

            {/* Share buttons */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Share2 className="h-4 w-4" /> Bagikan:
              </span>
              {[
                { id: "wa", label: "WhatsApp", color: "text-green-600" },
                { id: "telegram", label: "Telegram", color: "text-blue-500" },
                { id: "twitter", label: "X", color: "text-foreground" },
                { id: "fb", label: "Facebook", color: "text-blue-700" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleShare(s.id)}
                  className={`text-sm font-medium underline-offset-4 hover:underline ${s.color}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Separator className="mb-12" />

        {/* Pros & Cons */}
        {(product.pros?.length || product.cons?.length) && (
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {product.pros && product.pros.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Kelebihan
                </h2>
                <ul className="space-y-3">
                  {product.pros.map((pro, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-3"
                    >
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                      <span className="text-sm">{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {product.cons && product.cons.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  Kekurangan
                </h2>
                <ul className="space-y-3">
                  {product.cons.map((con, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3"
                    >
                      <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                      <span className="text-sm">{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Review Content */}
        {product.reviewContent && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Review Lengkap</h2>
            <div className="prose prose-sm md:prose dark:prose-invert max-w-none">
              {product.reviewContent.split("\n").map((line, i) => {
                if (line.startsWith("## "))
                  return (
                    <h2 key={i} className="text-xl font-bold mt-6 mb-3">
                      {line.slice(3)}
                    </h2>
                  );
                if (line.startsWith("### "))
                  return (
                    <h3 key={i} className="text-lg font-semibold mt-4 mb-2">
                      {line.slice(4)}
                    </h3>
                  );
                if (line.startsWith("# "))
                  return (
                    <h2 key={i} className="text-2xl font-bold mt-6 mb-3">
                      {line.slice(2)}
                    </h2>
                  );
                if (line.startsWith("*") && line.endsWith("*") && line.length > 2)
                  return (
                    <p key={i} className="text-sm italic text-muted-foreground mt-4">
                      {line.slice(1, -1)}
                    </p>
                  );
                if (line.trim() === "") return <br key={i} />;
                // Render **bold** inline
                const parts = line.split(/(\*\*[^*]+\*\*)/g);
                return (
                  <p key={i} className="mb-3 leading-relaxed">
                    {parts.map((p, j) =>
                      p.startsWith("**") && p.endsWith("**") ? (
                        <strong key={j}>{p.slice(2, -2)}</strong>
                      ) : (
                        <span key={j}>{p}</span>
                      ),
                    )}
                  </p>
                );
              })}
            </div>

            {/* Internal link suggestion inside review */}
            {cheaperAlternative && (
              <div className="mt-6 p-4 bg-muted/50 border-l-4 border-primary rounded-r-lg">
                <p className="text-sm">
                  💡 <strong>Cari yang lebih hemat?</strong> Cek juga review{" "}
                  <Link
                    href={`/product/${cheaperAlternative.slug}`}
                    className="text-primary font-semibold underline underline-offset-2 hover:no-underline"
                  >
                    {cheaperAlternative.name}
                  </Link>{" "}
                  yang dijual mulai {formatIdr(cheaperAlternative.price)}.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Comparison Table */}
        {comparisonProducts.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-2">Tabel Perbandingan</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Bandingkan {product.name} dengan {comparisonProducts.length} produk
              sejenis di kategori {product.category || "yang sama"}.
            </p>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="text-left p-3 font-semibold">Produk</th>
                    <th className="text-left p-3 font-semibold">Harga</th>
                    <th className="text-left p-3 font-semibold">Rating</th>
                    <th className="text-left p-3 font-semibold">Diskon</th>
                    <th className="text-left p-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-primary/5 border-t">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-12 h-12 object-cover rounded shrink-0"
                          loading="lazy"
                        />
                        <div>
                          <div className="font-semibold line-clamp-2">
                            {product.name}
                          </div>
                          <Badge variant="default" className="mt-1 text-xs">
                            Produk Ini
                          </Badge>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-bold text-primary">
                      {formatIdr(product.price)}
                    </td>
                    <td className="p-3">
                      {product.ratingStar ? (
                        <span className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          {product.ratingStar.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      {discount > 0 ? (
                        <Badge variant="destructive">-{discount}%</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <Button size="sm" asChild onClick={handleBuyClick}>
                        <a
                          href={product.affiliateLink}
                          target="_blank"
                          rel="sponsored nofollow noopener noreferrer"
                        >
                          Beli
                        </a>
                      </Button>
                    </td>
                  </tr>
                  {comparisonProducts.map((p) => {
                    const cmpDiscount = getDiscountPercent(
                      p.price,
                      p.priceBeforeDisc ?? 0,
                    );
                    return (
                      <tr key={p.id} className="border-t hover:bg-muted/30">
                        <td className="p-3">
                          <Link
                            href={`/product/${p.slug}`}
                            className="flex items-center gap-3 hover:text-primary"
                          >
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-12 h-12 object-cover rounded shrink-0"
                              loading="lazy"
                            />
                            <div className="font-medium line-clamp-2">
                              {p.name}
                            </div>
                          </Link>
                        </td>
                        <td className="p-3 font-semibold">{formatIdr(p.price)}</td>
                        <td className="p-3">
                          {p.ratingStar ? (
                            <span className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                              {p.ratingStar.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          {cmpDiscount > 0 ? (
                            <Badge variant="destructive">-{cmpDiscount}%</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/product/${p.slug}`}>Lihat</Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FAQ */}
        {product.faq && product.faq.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Pertanyaan Umum (FAQ)</h2>
            <Accordion type="single" collapsible className="w-full space-y-2">
              {product.faq.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="text-left font-medium">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}

        {/* CTA */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-8 text-center mb-12">
          <h3 className="text-xl font-bold mb-2">Tertarik dengan produk ini?</h3>
          <p className="text-muted-foreground mb-6">
            Dapatkan harga terbaik langsung di Shopee
          </p>
          <Button
            size="lg"
            className="gap-2 text-base font-semibold h-12 px-10"
            asChild
            onClick={handleBuyClick}
          >
            <a
              href={product.affiliateLink}
              target="_blank"
              rel="sponsored nofollow noopener noreferrer"
            >
              <ShoppingCart className="h-5 w-5" />
              Beli di Shopee Sekarang
            </a>
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Kami adalah mitra afiliasi Shopee. Tautan di atas menggunakan{" "}
            <code className="text-[10px]">rel="sponsored nofollow"</code>.
          </p>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Produk Terkait</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
