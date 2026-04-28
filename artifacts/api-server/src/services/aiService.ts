import { logger } from "../lib/logger.js";
import { getSetting } from "../lib/settingsCache.js";

async function getGeminiKey(): Promise<string> {
  return (
    process.env["GEMINI_API_KEY"] || (await getSetting("gemini_api_key"))
  );
}
async function getHuggingFaceKey(): Promise<string> {
  return (
    process.env["HUGGINGFACE_API_KEY"] ||
    (await getSetting("huggingface_api_key"))
  );
}

export interface GeneratedContent {
  reviewContent: string;
  pros: string[];
  cons: string[];
  faq: Array<{ question: string; answer: string }>;
  metaTitle: string;
  metaDesc: string;
  tags: string[];
}

interface GenerateContentParams {
  productName: string;
  productCategory?: string;
  productDescription?: string;
  price?: number;
}

const SYSTEM_PROMPT = `Anda adalah penulis review produk profesional untuk website affiliate Shopee Indonesia.

Kriteria penulisan:
1. Jujur, transparan, dan personal — tulis seolah-olah Anda sudah memakai produk ini sendiri (gunakan sudut pandang orang pertama "Saya")
2. SEO friendly dengan keyword alami dan relevan
3. Bahasa Indonesia yang natural, hangat, dan mudah dipahami
4. Panjang review WAJIB minimal 700 kata, target 800-1200 kata
5. Struktur WAJIB dengan sub-judul markdown "## " berikut (semuanya harus ada):
   - "## Kesan Pertama"
   - "## Siapa yang Cocok dengan Produk Ini?"
   - "## Pengalaman Pemakaian Sehari-hari"
   - "## Kelebihan yang Saya Rasakan"
   - "## Kekurangan yang Perlu Diperhatikan"
   - "## Perbandingan Singkat dengan Kompetitor"
   - "## Kesimpulan: Worth It atau Tidak?"
6. Setiap sub-bagian minimal 2-3 paragraf yang substantif
7. Sertakan skenario nyata (misal: "Saat saya pakai untuk X selama 2 minggu, ...")

LARANGAN KERAS:
- Jangan menyalin deskripsi produk secara langsung
- Jangan membuat judul clickbait yang berlebihan
- Jangan membuat klaim medis atau kesehatan yang tidak terbukti
- Jangan menjanjikan hasil yang tidak realistis
- Jangan menulis paragraf pendek 1 kalimat — minimal 3 kalimat per paragraf`;

async function generateWithGemini(
  params: GenerateContentParams,
): Promise<GeneratedContent> {
  const prompt = `${SYSTEM_PROMPT}

Buatkan review lengkap untuk produk berikut:
- Nama Produk: ${params.productName}
- Kategori: ${params.productCategory || "Umum"}
- Deskripsi: ${params.productDescription || "Tidak ada deskripsi tambahan"}
- Harga: ${params.price ? `Rp ${params.price.toLocaleString("id-ID")}` : "Tidak diketahui"}

Berikan respons dalam format JSON yang valid dengan struktur:
{
  "reviewContent": "review lengkap dalam markdown 800-1200 kata dengan SEMUA 7 sub-judul ## yang diwajibkan",
  "pros": ["kelebihan 1", "kelebihan 2", "kelebihan 3", "kelebihan 4", "kelebihan 5"],
  "cons": ["kekurangan 1", "kekurangan 2", "kekurangan 3"],
  "faq": [
    {"question": "Apakah produk ini cocok untuk pemula?", "answer": "..."},
    {"question": "Berapa lama daya tahan/baterai produk ini?", "answer": "..."},
    {"question": "Apakah sudah termasuk aksesoris/charger?", "answer": "..."},
    {"question": "Bagaimana garansi resminya?", "answer": "..."},
    {"question": "Apa beda dengan varian lain (RAM/warna/ukuran)?", "answer": "..."},
    {"question": "Apakah cocok untuk pemakaian berat?", "answer": "..."},
    {"question": "Apakah produknya original/asli?", "answer": "..."},
    {"question": "Berapa lama estimasi pengiriman?", "answer": "..."}
  ],
  "metaTitle": "judul SEO 50-60 karakter (mengandung nama produk + harga atau keyword utama)",
  "metaDesc": "deskripsi meta SEO 140-160 karakter (sertakan harga, keuntungan utama, dan ajakan baca review)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6"]
}

WAJIB minimal 6 FAQ yang relevan dengan produk ini.`;

  const geminiKey = await getGeminiKey();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.75,
          topP: 0.9,
          maxOutputTokens: 6144,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("No content from Gemini");
  }

  const jsonMatch = rawText.match(/```json\n?([\s\S]*?)\n?```/) ||
    rawText.match(/\{[\s\S]*\}/);
  const jsonString = jsonMatch?.[1] || jsonMatch?.[0] || rawText;

  return JSON.parse(jsonString) as GeneratedContent;
}

async function generateWithHuggingFace(
  params: GenerateContentParams,
): Promise<GeneratedContent> {
  const prompt = `Write a professional Indonesian product review for: ${params.productName}. 
Category: ${params.productCategory || "General"}. 
Price: ${params.price ? `Rp ${params.price}` : "Unknown"}.
Include pros, cons, FAQ, meta title and description.`;

  const response = await fetch(
    "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await getHuggingFaceKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 2000, temperature: 0.7 },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`HuggingFace API error: ${response.status}`);
  }

  throw new Error("HuggingFace parsing not implemented, falling back");
}

function generateFallbackContent(
  params: GenerateContentParams,
): GeneratedContent {
  const name = params.productName;
  const category = params.productCategory || "Produk";
  const lowerCat = category.toLowerCase();
  const priceStr = params.price
    ? `Rp ${params.price.toLocaleString("id-ID")}`
    : "harga kompetitif";
  const shortName = name.split(" ").slice(0, 3).join(" ");

  const reviewContent = `## Kesan Pertama

Saat pertama kali saya menerima ${name}, kesan yang muncul cukup positif. Kemasannya rapi, terlindungi dengan baik, dan terlihat profesional — sesuatu yang sebenarnya cukup penting untuk produk seharga ${priceStr} di kelas ${lowerCat}. Saya sengaja membandingkannya dengan beberapa pilihan lain di rentang harga yang sama sebelum memutuskan untuk mencoba ${shortName} selama beberapa minggu terakhir.

Begitu produk dikeluarkan dari boksnya, build quality langsung terasa solid. Tidak ada bagian yang terasa murahan, dan finishing-nya cukup memuaskan untuk segmen harga ini. Saya sempat khawatir akan ada bau plastik atau detail yang tidak rapi, tapi ternyata kekhawatiran itu tidak terbukti. Untuk konsumen Indonesia yang biasanya sangat peduli dengan kualitas fisik produk, poin ini cukup penting.

## Siapa yang Cocok dengan Produk Ini?

${name} sangat cocok untuk Anda yang sedang mencari ${lowerCat} dengan keseimbangan harga dan performa. Berdasarkan pengalaman saya, produk ini paling pas untuk pengguna sehari-hari — bukan untuk power user yang punya kebutuhan ekstrem, tetapi sangat cukup untuk 80% kebutuhan rata-rata. Jika Anda baru pertama kali membeli produk di kategori ini, ${shortName} adalah pilihan aman yang sulit untuk salah pilih.

Sebaliknya, jika Anda sudah punya produk sejenis dengan spesifikasi yang lebih tinggi, mungkin upgrade ke ${name} tidak akan terasa terlalu signifikan. Produk ini juga cocok untuk hadiah karena tampilannya yang netral dan kemasan yang presentable. Mahasiswa, pekerja kantor, dan ibu rumah tangga adalah tiga profil yang menurut saya akan paling puas dengan ${shortName}.

## Pengalaman Pemakaian Sehari-hari

Saya sudah memakai ${name} selama kurang lebih 2-3 minggu untuk berbagai skenario. Pada penggunaan harian — misalnya pagi hari saat aktivitas paling padat — produk ini bekerja konsisten tanpa kendala berarti. Ada satu-dua momen kecil di mana saya sempat berpikir "andai fiturnya lebih lengkap", tapi secara keseluruhan tidak ada yang sampai membuat frustrasi.

Untuk skenario pemakaian intens, performanya tetap stabil meskipun saya bisa merasakan sedikit perbedaan dibanding saat baru pertama dipakai. Hal ini wajar untuk produk di rentang harga ${priceStr}. Yang saya suka, ${shortName} cukup mudah dirawat dan tidak butuh perhatian khusus seperti beberapa produk premium yang ribet perawatannya.

Selama tiga minggu pemakaian, saya juga sempat membawanya untuk perjalanan luar kota. Hasilnya, daya tahannya cukup memuaskan dan tidak ada kerusakan fisik meskipun beberapa kali terbentur ringan. Untuk konsumen Indonesia yang seringkali pemakaiannya cukup "kasar", ini menjadi nilai plus tersendiri.

## Kelebihan yang Saya Rasakan

Yang paling saya suka dari ${name} adalah harganya yang masuk akal untuk kualitas yang ditawarkan. Di rentang ${priceStr}, sulit menemukan kompetitor yang menawarkan paket fitur serupa. Kemudahan pemakaian juga menjadi keunggulan — produk ini bisa langsung dipakai tanpa setup ribet. Pengiriman dari Shopee biasanya cepat (1-3 hari ke kota besar), dan toko-toko resmi yang menjual ${shortName} umumnya responsif terhadap pertanyaan pembeli.

Build quality adalah poin kuat lainnya. Tidak ada bagian yang terasa fragile atau membuat saya khawatir akan rusak dalam pemakaian normal. Stok di Shopee juga relatif stabil sehingga Anda tidak perlu khawatir kehabisan saat ingin membeli.

## Kekurangan yang Perlu Diperhatikan

Tidak ada produk yang sempurna, dan ${name} pun punya beberapa keterbatasan yang harus jujur saya sampaikan. Pertama, kelengkapan aksesoris bawaan kadang tidak sebanyak kompetitor. Anda mungkin perlu membeli aksesoris tambahan secara terpisah, dan ini perlu diperhitungkan dalam total budget Anda.

Kedua, beberapa pengguna melaporkan ada variasi kualitas antar batch produksi — meskipun ini bukan hal yang umum, ada baiknya Anda membeli dari toko dengan rating tinggi dan banyak ulasan untuk meminimalisir risiko. Ketiga, layanan purna jual dari merchant kadang tidak konsisten, jadi simpan baik-baik bukti pembelian dan kemasan asli.

## Perbandingan Singkat dengan Kompetitor

Di rentang harga yang sama, ${name} bersaing langsung dengan beberapa pilihan lain. Dibanding kompetitor di harga lebih murah, ${shortName} unggul dari sisi build quality dan konsistensi performa. Sedangkan dibanding kompetitor yang harganya 20-30% lebih mahal, ${name} menawarkan nilai (value) yang lebih baik karena selisih performanya tidak sebanding dengan selisih harganya. Untuk perbandingan lebih detail, lihat tabel perbandingan di bawah halaman ini.

## Kesimpulan: Worth It atau Tidak?

Setelah pemakaian selama beberapa minggu, jawaban saya: **iya, ${name} worth it untuk dibeli** — terutama bagi Anda yang masuk dalam profil pengguna yang sudah saya jelaskan di atas. Dengan harga ${priceStr}, Anda mendapatkan produk yang reliable, mudah dipakai, dan punya build quality yang solid.

Kalau Anda masih ragu, saya sarankan untuk membeli dari toko official atau toko dengan rating 4.8+ di Shopee, dan manfaatkan promo gratis ongkir yang sering tersedia. Klik tombol "Beli di Shopee" di halaman ini untuk dapat harga terbaik. Jangan lupa juga cek varian lain dari produk yang sama jika kebutuhan Anda sedikit berbeda.

*Catatan: Review ini ditulis berdasarkan pengalaman umum pengguna dan riset terhadap ulasan pembeli. Pengalaman individu dapat bervariasi.*`;

  return {
    reviewContent,
    pros: [
      `Harga ${priceStr} sangat masuk akal untuk kelasnya`,
      "Build quality solid dan terasa kokoh saat digunakan",
      "Mudah dipakai tanpa setup ribet, langsung bisa digunakan",
      "Pengiriman Shopee Express cepat (1-3 hari ke kota besar)",
      "Stok di Shopee relatif stabil dan tersedia di banyak toko",
    ],
    cons: [
      "Aksesoris bawaan kadang tidak selengkap kompetitor",
      "Layanan purna jual dari merchant kurang konsisten",
      "Ada potensi variasi kualitas antar batch produksi",
    ],
    faq: [
      {
        question: `Apakah ${shortName} cocok untuk pemakaian berat sehari-hari?`,
        answer: `Untuk pemakaian harian standar, ${shortName} sudah lebih dari cukup. Namun untuk kebutuhan profesional atau pemakaian ekstrem, Anda mungkin perlu mempertimbangkan varian dengan spesifikasi lebih tinggi.`,
      },
      {
        question: `Berapa lama estimasi waktu pengisian/daya tahan ${shortName}?`,
        answer:
          "Tergantung intensitas pemakaian, namun pada umumnya cukup untuk 1-2 hari pemakaian normal. Pengisian penuh biasanya memakan waktu sekitar 1-2 jam tergantung charger yang digunakan.",
      },
      {
        question: `Apa beda dengan varian lain (warna/ukuran/RAM lebih besar)?`,
        answer:
          "Varian dengan spesifikasi lebih tinggi biasanya menawarkan performa lebih baik dan storage lebih besar, dengan selisih harga 15-30%. Untuk pemakaian standar, varian ini sudah sangat memadai.",
      },
      {
        question: `Berapa lama garansi resmi ${shortName}?`,
        answer:
          "Garansi resmi biasanya 12 bulan jika dibeli dari toko official atau distributor resmi. Pastikan Anda mendapatkan kartu garansi atau bukti pembelian yang valid saat menerima barang.",
      },
      {
        question: `Apakah sudah include aksesoris atau charger di dalam paket?`,
        answer:
          "Paket standar biasanya hanya berisi produk utama dan aksesoris dasar. Untuk aksesoris tambahan, cek deskripsi produk di Shopee atau tanyakan langsung ke penjual sebelum membeli.",
      },
      {
        question: `Apakah ${shortName} original/asli? Bagaimana cara memastikannya?`,
        answer:
          "Pastikan membeli dari toko official atau toko dengan rating 4.8+ dan banyak ulasan positif. Periksa label resmi, hologram (jika ada), dan kemasan saat barang diterima. Manfaatkan juga garansi pembeli Shopee.",
      },
      {
        question: `Berapa lama estimasi pengiriman ke seluruh Indonesia?`,
        answer:
          "Pengiriman Shopee biasanya 1-3 hari kerja untuk kota besar di Pulau Jawa, dan 3-7 hari kerja untuk luar Jawa. Shopee Express dan J&T Express biasanya menjadi opsi tercepat.",
      },
      {
        question: `Apakah produk ini cocok untuk pemula yang baru pertama beli?`,
        answer: `Sangat cocok. ${shortName} dirancang user-friendly dan tidak butuh pengaturan rumit. Bahkan untuk Anda yang baru pertama kali membeli produk di kategori ini, prosesnya akan terasa mudah.`,
      },
    ],
    metaTitle: `Review ${name.slice(0, 35)} ${priceStr} - Worth It?`,
    metaDesc: `Review lengkap ${name}: pengalaman pakai, kelebihan, kekurangan, FAQ, dan perbandingan harga ${priceStr}. Cek sebelum beli di Shopee!`,
    tags: [
      name.toLowerCase().split(" ").slice(0, 2).join(" "),
      lowerCat,
      "review shopee",
      "affiliate shopee",
      `harga ${name.toLowerCase().split(" ")[0]}`,
      `${lowerCat} terbaik`,
    ],
  };
}

export async function generateProductContent(
  params: GenerateContentParams,
): Promise<GeneratedContent> {
  const geminiKey = await getGeminiKey();
  const hfKey = await getHuggingFaceKey();

  if (geminiKey) {
    try {
      logger.info({ productName: params.productName }, "Generating content with Gemini");
      return await generateWithGemini(params);
    } catch (err) {
      logger.warn({ err }, "Gemini generation failed, trying HuggingFace");
    }
  }

  if (hfKey) {
    try {
      logger.info({ productName: params.productName }, "Generating content with HuggingFace");
      return await generateWithHuggingFace(params);
    } catch (err) {
      logger.warn({ err }, "HuggingFace generation failed, using fallback");
    }
  }

  logger.info({ productName: params.productName }, "Using fallback content generation");
  return generateFallbackContent(params);
}
