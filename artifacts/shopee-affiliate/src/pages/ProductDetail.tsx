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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const { data: product, isLoading } = useGetProductBySlug(slug!, {
    query: { enabled: !!slug },
  });
  const { data: relatedData } = useListProducts({
    category: product?.category ?? undefined,
    limit: 4,
  });
  const trackClick = useTrackProductClick();

  useEffect(() => {
    if (product) {
      document.title = product.metaTitle || product.name;
    }
  }, [product]);

  const handleBuyClick = () => {
    if (product) {
      trackClick.mutate({ id: product.id, data: { referer: window.location.href } });
    }
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = `Cek produk ini di Shopee: ${product?.name}`;
    const shareUrls: Record<string, string> = {
      wa: `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      fb: `https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    };
    window.open(shareUrls[platform], "_blank", "noopener,noreferrer");
  };

  const relatedProducts = relatedData?.products.filter((p) => p.id !== product?.id).slice(0, 4) ?? [];

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
          <Button asChild><Link href="/">Kembali ke Beranda</Link></Button>
        </div>
      </Layout>
    );
  }

  const discount = getDiscountPercent(product.price, product.priceBeforeDisc ?? 0);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-primary transition-colors">Beranda</Link>
          <span>/</span>
          {product.category && (
            <>
              <Link href={`/search?category=${encodeURIComponent(product.category)}`} className="hover:text-primary transition-colors">
                {product.category}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-foreground line-clamp-1">{product.name}</span>
        </nav>

        {/* Product Hero */}
        <div className="grid md:grid-cols-2 gap-10 mb-12">
          <div className="relative">
            <div className="aspect-square overflow-hidden rounded-xl bg-muted">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {discount > 0 && (
              <Badge variant="destructive" className="absolute top-4 right-4 text-base font-bold px-3 py-1">
                -{discount}%
              </Badge>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div>
              {product.category && (
                <Badge variant="outline" className="mb-2">{product.category}</Badge>
              )}
              <h1 className="text-2xl md:text-3xl font-bold leading-tight">{product.name}</h1>
            </div>

            {product.shopName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Oleh</span>
                <span className="font-medium text-foreground">{product.shopName}</span>
                {product.shopRating && (
                  <Badge variant="outline" className="gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {product.shopRating.toFixed(1)}
                  </Badge>
                )}
              </div>
            )}

            {product.ratingStar && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${i < Math.round(product.ratingStar!) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                    />
                  ))}
                </div>
                <span className="font-semibold">{product.ratingStar.toFixed(1)}</span>
                {product.soldCount && (
                  <span className="text-sm text-muted-foreground">
                    {formatNumber(product.soldCount)} terjual
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
              <div className="text-4xl font-bold text-primary">{formatIdr(product.price)}</div>
              {product.commission && (
                <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Komisi: {formatIdr(product.commission)} ({product.commissionRate?.toFixed(1)}%)
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {formatNumber(product.viewCount)} dilihat</span>
              <span className="flex items-center gap-1"><MousePointerClick className="h-4 w-4" /> {formatNumber(product.clickCount)} diklik</span>
            </div>

            <Button
              size="lg"
              className="w-full text-base gap-2 font-semibold h-14"
              asChild
              onClick={handleBuyClick}
            >
              <a href={product.affiliateLink} target="_blank" rel="sponsored noopener noreferrer">
                <ShoppingCart className="h-5 w-5" />
                Beli di Shopee
              </a>
            </Button>

            {/* Share buttons */}
            <div className="flex items-center gap-2">
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
                    <li key={i} className="flex items-start gap-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-3">
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
                    <li key={i} className="flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3">
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
                if (line.startsWith("## ")) return <h2 key={i} className="text-xl font-bold mt-6 mb-3">{line.slice(3)}</h2>;
                if (line.startsWith("### ")) return <h3 key={i} className="text-lg font-semibold mt-4 mb-2">{line.slice(4)}</h3>;
                if (line.trim() === "") return <br key={i} />;
                return <p key={i} className="mb-3 leading-relaxed">{line}</p>;
              })}
            </div>
          </div>
        )}

        {/* FAQ */}
        {product.faq && product.faq.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Pertanyaan Umum (FAQ)</h2>
            <Accordion type="single" collapsible className="w-full space-y-2">
              {product.faq.map((item, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg px-4">
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
          <p className="text-muted-foreground mb-6">Dapatkan harga terbaik langsung di Shopee</p>
          <Button size="lg" className="gap-2 text-base font-semibold h-12 px-10" asChild onClick={handleBuyClick}>
            <a href={product.affiliateLink} target="_blank" rel="sponsored noopener noreferrer">
              <ShoppingCart className="h-5 w-5" />
              Beli di Shopee Sekarang
            </a>
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Kami adalah mitra afiliasi Shopee. Tautan di atas menggunakan rel="sponsored".
          </p>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Produk Terkait</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
