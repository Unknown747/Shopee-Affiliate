import { Link } from "wouter";
import { useEffect, useState } from "react";
import { Tag, ChevronRight } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SeoHead } from "@/components/SeoHead";
import { Skeleton } from "@/components/ui/skeleton";
import { setBreadcrumbLd, removeJsonLd } from "@/lib/jsonld";

const API_BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

type Collection = {
  tag: string;
  slug: string;
  productCount: number;
};

export default function KoleksiIndex() {
  const [items, setItems] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/koleksi`)
      .then((r) => r.json())
      .then((d) => setItems(d.collections ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setBreadcrumbLd("ld-breadcrumb-koleksi", [
      { name: "Beranda", path: "/" },
      { name: "Koleksi Tematik", path: "/koleksi" },
    ]);
    return () => removeJsonLd("ld-breadcrumb-koleksi");
  }, []);

  return (
    <Layout>
      <SeoHead
        title="Koleksi Tematik"
        description="Eksplor produk berdasarkan tag tematik — dari budget, segmen pengguna, hingga use-case spesifik. Update otomatis dari katalog."
      />
      <div className="container mx-auto px-4 py-8">
        <nav className="text-xs text-muted-foreground mb-3">
          <Link href="/" className="hover:underline">
            Beranda
          </Link>{" "}
          / <span>Koleksi Tematik</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Tag className="h-7 w-7 text-primary" />
            Koleksi Tematik
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Cari produk berdasarkan kebutuhan atau topik spesifik — koleksi
            otomatis dikelompokkan dari tag pada tiap produk.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-32 rounded-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">
            Belum ada koleksi yang tersedia. Tambah tag pada produk untuk
            mengaktifkan halaman ini.
          </p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {items.map((it) => (
              <Link
                key={it.slug}
                href={`/koleksi/${it.slug}`}
                className="group inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card hover:border-primary hover:shadow-sm hover:bg-primary/5 transition-all"
              >
                <Tag className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                <span className="font-medium text-sm capitalize">
                  {it.tag}
                </span>
                <span className="text-xs text-muted-foreground">
                  {it.productCount}
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
