import { useEffect, useState } from "react";
import { Link } from "wouter";
import { HelpCircle, ChevronDown } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { SeoHead } from "@/components/SeoHead";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  setBreadcrumbLd,
  setJsonLd,
  removeJsonLd,
} from "@/lib/jsonld";

const API_BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

type FaqItem = {
  question: string;
  answer: string;
  productSlug: string;
  productName: string;
};

type CategoryGroup = {
  category: string;
  faqs: FaqItem[];
};

export default function FaqHub() {
  const [data, setData] = useState<{
    categories: CategoryGroup[];
    totalCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/faq`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!data) return;
    setBreadcrumbLd("ld-breadcrumb-faq", [
      { name: "Beranda", path: "/" },
      { name: "FAQ", path: "/faq" },
    ]);
    // Aggregate first 30 FAQs into single FAQPage schema
    const allFaqs = data.categories.flatMap((c) => c.faqs).slice(0, 30);
    if (allFaqs.length > 0) {
      setJsonLd("ld-faq-page", {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: allFaqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.answer,
          },
        })),
      });
    }
    return () => {
      removeJsonLd("ld-breadcrumb-faq");
      removeJsonLd("ld-faq-page");
    };
  }, [data]);

  return (
    <Layout>
      <SeoHead
        title="Pertanyaan yang Sering Ditanya (FAQ)"
        description="Kumpulan pertanyaan dan jawaban paling sering dari pembaca tentang produk Shopee yang kami review — dari spesifikasi, garansi, hingga cara perawatan."
        path="/faq"
      />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <nav className="text-xs text-muted-foreground mb-3">
          <Link href="/" className="hover:underline">
            Beranda
          </Link>{" "}
          / <span>FAQ</span>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-2">
            <HelpCircle className="h-8 w-8 text-primary" />
            Pertanyaan Sering Ditanya
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Jawaban atas pertanyaan paling umum dari pembaca seputar produk yang
            kami review — dikelompokkan per kategori.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : !data || data.categories.length === 0 ? (
          <div className="text-center py-20">
            <HelpCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-lg font-medium mb-1">Belum ada FAQ tersedia</p>
            <p className="text-sm text-muted-foreground">
              Tambah FAQ pada produk untuk mengisi halaman ini secara otomatis.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {data.categories.map((group) => (
              <section key={group.category}>
                <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <span className="capitalize">{group.category}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {group.faqs.length} pertanyaan
                  </span>
                </h2>
                <Accordion
                  type="single"
                  collapsible
                  className="border border-border rounded-xl bg-card divide-y divide-border"
                >
                  {group.faqs.map((f, i) => (
                    <AccordionItem
                      key={`${f.productSlug}-${i}`}
                      value={`${group.category}-${i}`}
                      className="border-b-0 px-4"
                    >
                      <AccordionTrigger className="text-left text-sm font-medium hover:no-underline py-4">
                        {f.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                        <div className="whitespace-pre-wrap">{f.answer}</div>
                        <Link
                          href={`/product/${f.productSlug}`}
                          className="inline-block mt-3 text-xs text-primary hover:underline"
                        >
                          Lihat produk: {f.productName} →
                        </Link>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
