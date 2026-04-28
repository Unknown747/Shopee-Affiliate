import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { useListProducts, useListCategories } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, FileText } from "lucide-react";

export default function SitemapPage() {
  const { data: productsData, isLoading } = useListProducts({ limit: 100 });
  const { data: categories } = useListCategories();

  const staticPages = [
    { href: "/", title: "Beranda" },
    { href: "/search", title: "Semua Produk" },
    { href: "/generate", title: "Generator Konten AI" },
    { href: "/about", title: "Tentang Kami" },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-10">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            Sitemap
          </h1>
          <p className="text-muted-foreground mt-2">Daftar lengkap semua halaman di ShopeeRecommend</p>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-lg font-bold mb-4 text-muted-foreground uppercase text-sm tracking-wider">Halaman Utama</h2>
            <ul className="space-y-2">
              {staticPages.map((page) => (
                <li key={page.href}>
                  <Link href={page.href} className="flex items-center gap-2 text-primary hover:underline underline-offset-4">
                    <ExternalLink className="h-4 w-4" />
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>

            {categories && categories.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-bold mb-4 text-muted-foreground uppercase text-sm tracking-wider">Kategori</h2>
                <ul className="space-y-2">
                  {categories.map((cat) => (
                    <li key={cat.category}>
                      <Link
                        href={`/search?category=${encodeURIComponent(cat.category)}`}
                        className="flex items-center gap-2 text-primary hover:underline underline-offset-4"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {cat.category} ({cat.count} produk)
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-bold mb-4 text-muted-foreground uppercase text-sm tracking-wider">
              Halaman Produk ({productsData?.total ?? 0})
            </h2>

            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : (
              <ul className="space-y-2">
                {productsData?.products.map((product) => (
                  <li key={product.id}>
                    <Link
                      href={`/product/${product.slug}`}
                      className="flex items-center gap-2 text-primary hover:underline underline-offset-4 text-sm"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{product.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
