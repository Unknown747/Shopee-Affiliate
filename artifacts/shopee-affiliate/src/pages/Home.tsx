import { Link } from "wouter";
import { ArrowRight, TrendingUp } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { ProductCard } from "@/components/ProductCard";
import { LinkGenerator } from "@/components/LinkGenerator";
import { useListProducts, useListCategories } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const { data: productsData, isLoading: isLoadingProducts } = useListProducts({ limit: 8, sort: "popular" });
  const { data: categoriesData, isLoading: isLoadingCategories } = useListCategories();

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="absolute inset-0 bg-primary/5 [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
        <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
          <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
            Platform Rekomendasi Terpercaya
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-balance">
            Temukan Produk Terbaik dari <span className="text-primary">Shopee</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Review jujur, panduan belanja, dan rekomendasi produk berkualitas untuk membantu Anda berbelanja lebih cerdas.
          </p>
          
          <div className="max-w-2xl mx-auto text-left">
            <LinkGenerator />
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Kategori Populer</h2>
            <Button variant="ghost" asChild>
              <Link href="/search">Lihat Semua <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {isLoadingCategories ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))
            ) : categoriesData?.slice(0, 6).map((cat) => (
              <Link key={cat.category} href={`/search?category=${encodeURIComponent(cat.category)}`} className="group">
                <div className="bg-card border border-border rounded-xl p-6 text-center h-full flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:shadow-md transition-all">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <span className="font-medium text-sm capitalize">{cat.category}</span>
                  <span className="text-xs text-muted-foreground">{cat.count} produk</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Products */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Rekomendasi Terbaru</h2>
            <Button variant="outline" asChild>
              <Link href="/search">Eksplorasi <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {isLoadingProducts ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-square rounded-xl" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))
            ) : productsData?.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
