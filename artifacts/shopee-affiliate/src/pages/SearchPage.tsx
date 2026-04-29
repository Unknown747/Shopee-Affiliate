import { useState } from "react";
import { useSearch, useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { SeoHead } from "@/components/SeoHead";
import { ProductCard } from "@/components/ProductCard";
import { useSearchProducts, useListCategories } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal, X } from "lucide-react";

export default function SearchPage() {
  const searchStr = useSearch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(searchStr);

  const [query, setQuery] = useState(params.get("q") || "");
  const [category, setCategory] = useState(params.get("category") || "");
  const [sort, setSort] = useState<"newest" | "cheapest" | "rating" | "popular">(
    (params.get("sort") as "newest" | "cheapest" | "rating" | "popular") || "newest"
  );
  const [page, setPage] = useState(1);

  const { data: categoriesData } = useListCategories();
  const { data, isLoading } = useSearchProducts({
    q: query || undefined,
    category: category || undefined,
    sort,
    page,
    limit: 12,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    const newParams = new URLSearchParams();
    if (query) newParams.set("q", query);
    if (category) newParams.set("category", category);
    if (sort !== "newest") newParams.set("sort", sort);
    setLocation(`/search?${newParams.toString()}`);
  };

  const qParam = params.get("q");
  const catParam = params.get("category");
  const seoTitle = qParam
    ? `Hasil pencarian "${qParam}"`
    : catParam
      ? `Produk kategori ${catParam}`
      : "Semua Produk Pilihan";
  const seoDesc = qParam
    ? `Temukan produk Shopee terbaik untuk "${qParam}" dengan harga & rating terbaik. Update tiap hari.`
    : "Jelajahi seluruh katalog produk Shopee pilihan kami: harga terbaik, rating tinggi, dan banyak pilihan gratis ongkir.";

  return (
    <Layout>
      <SeoHead
        title={seoTitle}
        description={seoDesc}
        type="website"
        noindex={Boolean(qParam)}
      />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {qParam ? `Hasil pencarian: "${qParam}"` : "Semua Produk"}
          </h1>
          {data && (
            <p className="text-muted-foreground">{data.total} produk ditemukan</p>
          )}
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari produk..."
              className="pl-10 h-12"
            />
          </div>
          <Button type="submit" size="lg" className="h-12 px-8">Cari</Button>
        </form>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter:</span>
          </div>

          <Select value={category} onValueChange={(v) => { setCategory(v === "all" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="Semua Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              {categoriesData?.map((cat) => (
                <SelectItem key={cat.category} value={cat.category}>
                  {cat.category} ({cat.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(v: typeof sort) => { setSort(v); setPage(1); }}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Terbaru</SelectItem>
              <SelectItem value="cheapest">Termurah</SelectItem>
              <SelectItem value="rating">Rating Tertinggi</SelectItem>
              <SelectItem value="popular">Terpopuler</SelectItem>
            </SelectContent>
          </Select>

          {(category || query) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setCategory(""); setQuery(""); setPage(1); setLocation("/search"); }}
              className="gap-1"
            >
              <X className="h-4 w-4" /> Reset
            </Button>
          )}
        </div>

        {/* Active filter badges */}
        {(category || query) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {query && (
              <Badge variant="secondary" className="gap-1">
                Cari: {query}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setQuery("")} />
              </Badge>
            )}
            {category && (
              <Badge variant="secondary" className="gap-1">
                {category}
                <X className="h-3 w-3 cursor-pointer" onClick={() => setCategory("")} />
              </Badge>
            )}
          </div>
        )}

        {/* Product Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : !data?.products.length ? (
          <div className="text-center py-20">
            <Search className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Produk tidak ditemukan</h3>
            <p className="text-muted-foreground mb-6">Coba ubah kata kunci atau filter pencarian</p>
            <Button onClick={() => { setQuery(""); setCategory(""); setLocation("/search"); }}>
              Lihat Semua Produk
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {data.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Sebelumnya
                </Button>
                {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="icon"
                    onClick={() => setPage(p)}
                    className="hidden sm:inline-flex"
                  >
                    {p}
                  </Button>
                ))}
                <span className="flex items-center text-sm text-muted-foreground sm:hidden">
                  {page} / {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={page >= data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Selanjutnya
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
