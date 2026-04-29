import { Layout } from "@/components/layout/Layout";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Shield, Star, Info } from "lucide-react";
import { useSiteConfig, resolveBrand } from "@/lib/site-config";

export default function AboutPage() {
  const { data: cfg } = useSiteConfig();
  const brand = resolveBrand(cfg).name;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="flex items-center gap-3 mb-2">
          <Badge variant="outline">Tentang Kami</Badge>
        </div>
        <h1 className="text-4xl font-bold mb-4">{brand}</h1>
        <p className="text-xl text-muted-foreground mb-10">
          Platform rekomendasi produk Shopee yang jujur, objektif, dan membantu Anda berbelanja lebih cerdas.
        </p>

        <div className="space-y-12">
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 rounded-lg p-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Tentang Platform Ini</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {brand} adalah platform yang menyajikan review produk-produk terbaik dari Shopee Indonesia.
              Kami mengkurasi, menganalisis, dan membuat konten review yang jujur untuk membantu Anda membuat
              keputusan pembelian yang lebih baik.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Setiap review dibuat berdasarkan analisis mendalam terhadap spesifikasi produk, ulasan pembeli
              nyata, dan perbandingan dengan produk sejenis di pasaran.
            </p>
          </section>

          <Separator />

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-2">
                <Info className="h-5 w-5 text-yellow-500" />
              </div>
              <h2 className="text-2xl font-bold">Pengungkapan Afiliasi</h2>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-xl p-6">
              <p className="text-sm leading-relaxed">
                <strong>Penting untuk diketahui:</strong> {brand} adalah peserta program afiliasi Shopee.
                Ini berarti kami mendapatkan komisi dari setiap pembelian yang dilakukan melalui tautan afiliasi
                di situs ini, <strong>tanpa biaya tambahan bagi Anda</strong>.
              </p>
              <p className="text-sm leading-relaxed mt-3">
                Semua tautan ke Shopee ditandai dengan <code>rel="sponsored"</code> sesuai standar
                transparansi web. Komisi yang kami terima tidak mempengaruhi objektivitas review kami.
                Kami berkomitmen untuk selalu memberikan ulasan yang jujur, termasuk menyebutkan kekurangan produk.
              </p>
            </div>
          </section>

          <Separator />

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-2">
                <Star className="h-5 w-5 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold">Standar Review Kami</h2>
            </div>
            <ul className="space-y-3">
              {[
                "Jujur dan transparan — kami selalu menyebutkan kekurangan produk",
                "Berbasis fakta — review berdasarkan analisis dan data nyata",
                "SEO friendly — konten dioptimalkan untuk pencarian organik",
                "Bebas klaim palsu — kami tidak membuat klaim medis atau janji berlebihan",
                "Tidak plagiarisme — semua konten original, tidak menyalin dari deskripsi produk",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <div className="bg-green-100 dark:bg-green-900/50 rounded-full p-1 mt-0.5 shrink-0">
                    <Star className="h-3 w-3 text-green-600 dark:text-green-400" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <Separator />

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-2">
                <Shield className="h-5 w-5 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold">Kebijakan Privasi</h2>
            </div>
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p>
                <strong className="text-foreground">Data yang dikumpulkan:</strong> Kami mengumpulkan data
                analitik anonim tentang klik tautan afiliasi untuk mengukur performa platform. Kami tidak
                mengumpulkan data pribadi pengguna.
              </p>
              <p>
                <strong className="text-foreground">Cookie:</strong> Kami menggunakan cookie untuk preferensi
                tampilan (mode gelap/terang) dan analitik dasar.
              </p>
              <p>
                <strong className="text-foreground">Tautan ke pihak ketiga:</strong> Kami tidak bertanggung
                jawab atas kebijakan privasi Shopee atau penjual di platform Shopee. Pastikan untuk membaca
                kebijakan mereka sebelum melakukan pembelian.
              </p>
            </div>
          </section>

          <Separator />

          <section>
            <h2 className="text-2xl font-bold mb-4">Disclaimer</h2>
            <div className="bg-muted/50 rounded-xl p-6 text-sm text-muted-foreground leading-relaxed space-y-3">
              <p>
                Informasi harga dan ketersediaan produk dapat berubah sewaktu-waktu. Kami berupaya menjaga
                akurasi informasi, namun disarankan untuk memverifikasi harga terkini langsung di Shopee.
              </p>
              <p>
                Review yang kami buat berdasarkan analisis informasi yang tersedia secara publik dan tidak
                menggantikan pengalaman langsung pengguna yang sudah membeli produk tersebut.
              </p>
              <p>
                {brand} bukanlah toko resmi Shopee dan tidak berafiliasi langsung dengan Shopee
                selain sebagai mitra afiliasi.
              </p>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}
