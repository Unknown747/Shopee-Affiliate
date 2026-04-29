import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Newspaper, Calendar } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SeoHead } from "@/components/SeoHead";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { setBreadcrumbLd, removeJsonLd } from "@/lib/jsonld";

const API_BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

type ArticleListItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  category: string | null;
  tags: string[] | null;
  author: string | null;
  publishedAt: string | null;
  viewCount: number;
};

function fmtDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BlogIndex() {
  const [items, setItems] = useState<ArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/articles`)
      .then((r) => r.json())
      .then((d) => setItems(d.articles ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setBreadcrumbLd("ld-breadcrumb-blog", [
      { name: "Beranda", path: "/" },
      { name: "Blog", path: "/blog" },
    ]);
    return () => removeJsonLd("ld-breadcrumb-blog");
  }, []);

  return (
    <Layout>
      <SeoHead
        title="Blog & Panduan Belanja"
        description="Artikel panduan, tips, dan ulasan mendalam seputar produk Shopee terpilih. Update tiap minggu."
        path="/blog"
      />
      <div className="container mx-auto px-4 py-8">
        <nav className="text-xs text-muted-foreground mb-3">
          <Link href="/" className="hover:underline">
            Beranda
          </Link>{" "}
          / <span>Blog</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-2">
            <Newspaper className="h-8 w-8 text-primary" />
            Blog & Panduan
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Tips, panduan, dan ulasan mendalam supaya Anda lebih percaya diri
            sebelum klik "Beli".
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-72 w-full rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Newspaper className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-lg font-medium mb-1">Belum ada artikel</p>
            <p className="text-sm text-muted-foreground">
              Cek kembali nanti — kami terus update tiap minggu.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((a) => (
              <Link
                key={a.id}
                href={`/blog/${a.slug}`}
                className="group block bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary transition-all"
              >
                {a.coverImage && (
                  <div className="aspect-[16/9] overflow-hidden bg-muted">
                    <img
                      src={a.coverImage}
                      alt={a.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-5">
                  {a.category && (
                    <Badge variant="secondary" className="mb-2 text-[10px]">
                      {a.category}
                    </Badge>
                  )}
                  <h2 className="font-bold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {a.title}
                  </h2>
                  {a.excerpt && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                      {a.excerpt}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground mt-3 flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    {fmtDate(a.publishedAt)}
                    {a.author && <span>· {a.author}</span>}
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
