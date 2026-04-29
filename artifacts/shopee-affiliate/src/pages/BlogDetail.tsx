import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { Newspaper, Calendar, ArrowLeft, Eye } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SeoHead } from "@/components/SeoHead";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  setBreadcrumbLd,
  setJsonLd,
  removeJsonLd,
} from "@/lib/jsonld";
import { useSiteConfig, resolveBrand } from "@/lib/site-config";

const API_BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

type Article = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  category: string | null;
  tags: string[] | null;
  author: string | null;
  metaTitle: string | null;
  metaDesc: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  viewCount: number;
};

type Related = Pick<Article, "slug" | "title" | "coverImage" | "excerpt" | "publishedAt">;

function fmtDate(d: string | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BlogDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const { data: cfg } = useSiteConfig();
  const brand = resolveBrand(cfg);

  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<Related[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    fetch(`${API_BASE}/api/articles/${encodeURIComponent(slug)}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((d) => {
        if (d) {
          setArticle(d.article);
          setRelated(d.related ?? []);
        }
      })
      .catch(() => setArticle(null))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!article) return;
    const origin = window.location.origin;
    const canonical = `${origin}/blog/${article.slug}`;
    setBreadcrumbLd("ld-breadcrumb-article", [
      { name: "Beranda", path: "/" },
      { name: "Blog", path: "/blog" },
      { name: article.title, path: `/blog/${article.slug}` },
    ]);
    setJsonLd("ld-article", {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: article.excerpt ?? article.metaDesc ?? undefined,
      image: article.coverImage ?? undefined,
      datePublished: article.publishedAt ?? undefined,
      dateModified: article.updatedAt ?? article.publishedAt ?? undefined,
      author: {
        "@type": "Organization",
        name: article.author ?? brand.name,
      },
      publisher: {
        "@type": "Organization",
        name: brand.name,
        ...(brand.logoUrl
          ? { logo: { "@type": "ImageObject", url: brand.logoUrl } }
          : {}),
      },
      mainEntityOfPage: canonical,
    });
    return () => {
      removeJsonLd("ld-breadcrumb-article");
      removeJsonLd("ld-article");
    };
  }, [article, brand.name, brand.logoUrl]);

  return (
    <Layout>
      <SeoHead
        title={article?.metaTitle ?? article?.title ?? "Blog"}
        description={article?.metaDesc ?? article?.excerpt ?? undefined}
        path={`/blog/${slug}`}
        type="article"
        image={article?.coverImage ?? undefined}
        noindex={notFound}
      />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <nav className="text-xs text-muted-foreground mb-3">
          <Link href="/" className="hover:underline">
            Beranda
          </Link>{" "}
          /{" "}
          <Link href="/blog" className="hover:underline">
            Blog
          </Link>{" "}
          / <span className="line-clamp-1">{article?.title ?? slug}</span>
        </nav>

        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke blog
        </Link>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="aspect-[16/9] w-full rounded-xl" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : notFound || !article ? (
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold mb-2">Artikel tidak ditemukan</h1>
            <p className="text-muted-foreground mb-6">
              Artikel mungkin sudah dihapus atau URL salah.
            </p>
            <Link
              href="/blog"
              className="text-primary hover:underline font-medium"
            >
              Lihat semua artikel →
            </Link>
          </div>
        ) : (
          <article>
            <header className="mb-6">
              {article.category && (
                <Badge variant="secondary" className="mb-3">
                  {article.category}
                </Badge>
              )}
              <h1 className="text-3xl md:text-4xl font-bold leading-tight">
                {article.title}
              </h1>
              {article.excerpt && (
                <p className="text-lg text-muted-foreground mt-3 leading-relaxed">
                  {article.excerpt}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-4 pb-4 border-b border-border">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {fmtDate(article.publishedAt)}
                </span>
                {article.author && <span>oleh {article.author}</span>}
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> {article.viewCount} dibaca
                </span>
              </div>
            </header>

            {article.coverImage && (
              <img
                src={article.coverImage}
                alt={article.title}
                className="w-full aspect-[16/9] object-cover rounded-xl mb-6"
              />
            )}

            <div
              className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-border">
                {article.tags.map((t) => (
                  <Link
                    key={t}
                    href={`/koleksi/${t.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                  >
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 hover:border-primary transition-colors"
                    >
                      #{t}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}

            {related.length > 0 && (
              <section className="mt-12 pt-8 border-t border-border">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Newspaper className="h-5 w-5 text-primary" />
                  Artikel Terkait
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {related.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/blog/${r.slug}`}
                      className="group block bg-card border border-border rounded-lg overflow-hidden hover:shadow-md hover:border-primary transition-all"
                    >
                      {r.coverImage && (
                        <div className="aspect-[16/9] overflow-hidden bg-muted">
                          <img
                            src={r.coverImage}
                            alt={r.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                      )}
                      <div className="p-3">
                        <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                          {r.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {fmtDate(r.publishedAt)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </article>
        )}
      </div>
    </Layout>
  );
}
