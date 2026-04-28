import { logger } from "../lib/logger.js";

const GEMINI_API_KEY = process.env["GEMINI_API_KEY"] || "";
const HUGGINGFACE_API_KEY = process.env["HUGGINGFACE_API_KEY"] || "";

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
1. Jujur dan transparan (sebutkan kekurangan nyata)
2. SEO friendly dengan keyword alami dan relevan
3. Bahasa Indonesia yang baik, formal namun mudah dipahami
4. Panjang review 800-1500 kata
5. Struktur: Pendahuluan -> Spesifikasi -> Kelebihan -> Kekurangan -> Perbandingan -> Kesimpulan -> FAQ

LARANGAN KERAS:
- Jangan menyalin deskripsi produk secara langsung
- Jangan membuat judul clickbait yang berlebihan
- Jangan membuat klaim medis atau kesehatan yang tidak terbukti
- Jangan menjanjikan hasil yang tidak realistis`;

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
  "reviewContent": "review lengkap dalam markdown 800-1500 kata",
  "pros": ["kelebihan 1", "kelebihan 2", "kelebihan 3", "kelebihan 4"],
  "cons": ["kekurangan 1", "kekurangan 2", "kekurangan 3"],
  "faq": [
    {"question": "pertanyaan 1?", "answer": "jawaban 1"},
    {"question": "pertanyaan 2?", "answer": "jawaban 2"},
    {"question": "pertanyaan 3?", "answer": "jawaban 3"}
  ],
  "metaTitle": "judul SEO 60 karakter",
  "metaDesc": "deskripsi meta SEO 155 karakter",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          maxOutputTokens: 4096,
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
        Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
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
  const priceStr = params.price
    ? `Rp ${params.price.toLocaleString("id-ID")}`
    : "harga kompetitif";

  return {
    reviewContent: `# Review ${name}: Apakah Layak Dibeli?

## Pendahuluan

${name} adalah salah satu produk ${category.toLowerCase()} yang saat ini banyak dicari di Shopee. Dengan harga ${priceStr}, produk ini menawarkan nilai yang menarik bagi konsumen Indonesia.

## Spesifikasi dan Fitur Utama

${name} hadir dengan berbagai fitur yang dirancang untuk memenuhi kebutuhan pengguna sehari-hari. Produk ini diproduksi dengan standar kualitas yang baik dan telah mendapatkan respons positif dari para pembeli.

## Kelebihan ${name}

Berdasarkan ulasan dari berbagai pembeli, ${name} memiliki beberapa keunggulan yang patut dipertimbangkan. Kualitas bahan dan konstruksi produk ini secara umum memuaskan untuk harga yang ditawarkan.

## Kekurangan ${name}

Seperti produk pada umumnya, ${name} juga memiliki beberapa keterbatasan yang perlu diperhatikan sebelum memutuskan untuk membeli.

## Perbandingan dengan Produk Sejenis

Dibandingkan dengan produk serupa di pasaran, ${name} menawarkan keseimbangan yang baik antara harga dan kualitas. Namun, ada beberapa alternatif yang mungkin lebih cocok tergantung kebutuhan spesifik Anda.

## Kesimpulan

${name} adalah pilihan yang layak dipertimbangkan bagi Anda yang mencari produk ${category.toLowerCase()} dengan anggaran ${priceStr}. Pastikan untuk membaca ulasan dari pembeli lain dan menyesuaikan dengan kebutuhan Anda sebelum membeli.

*Catatan: Konten ini dibuat secara otomatis. Kami merekomendasikan untuk melakukan riset lebih lanjut sebelum membeli.*`,
    pros: [
      `Harga terjangkau di kelasnya dengan nilai ${priceStr}`,
      "Kualitas produk sesuai dengan deskripsi penjual",
      "Pengiriman cepat melalui Shopee Express",
      "Tersedia garansi dari toko resmi",
    ],
    cons: [
      "Stok terbatas, perlu cepat memutuskan pembelian",
      "Ketersediaan layanan purna jual perlu dikonfirmasi",
      "Mungkin ada variasi kualitas antar batch produk",
    ],
    faq: [
      {
        question: `Apakah ${name} original/asli?`,
        answer:
          "Pastikan membeli dari toko resmi atau toko dengan rating tinggi untuk memastikan keaslian produk. Periksa label resmi dan kemasan produk saat menerima barang.",
      },
      {
        question: `Berapa lama pengiriman ${name}?`,
        answer:
          "Pengiriman melalui Shopee biasanya memakan waktu 1-5 hari kerja tergantung lokasi Anda. Shopee Express tersedia untuk pengiriman lebih cepat di area tertentu.",
      },
      {
        question: `Apakah ada garansi untuk ${name}?`,
        answer:
          "Garansi tergantung pada kebijakan toko. Cek halaman produk untuk informasi garansi resmi. Shopee juga menyediakan perlindungan pembeli jika produk tidak sesuai deskripsi.",
      },
    ],
    metaTitle: `Review ${name.slice(0, 40)} - Kelebihan, Kekurangan & Harga`,
    metaDesc: `Review lengkap ${name} di Shopee. Temukan kelebihan, kekurangan, dan apakah produk ini layak dibeli seharga ${priceStr}. Baca sebelum membeli!`,
    tags: [
      name.toLowerCase().split(" ").slice(0, 2).join(" "),
      category.toLowerCase(),
      "review shopee",
      "affiliate shopee",
      `harga ${name.toLowerCase().split(" ")[0]}`,
    ],
  };
}

export async function generateProductContent(
  params: GenerateContentParams,
): Promise<GeneratedContent> {
  if (GEMINI_API_KEY) {
    try {
      logger.info({ productName: params.productName }, "Generating content with Gemini");
      return await generateWithGemini(params);
    } catch (err) {
      logger.warn({ err }, "Gemini generation failed, trying HuggingFace");
    }
  }

  if (HUGGINGFACE_API_KEY) {
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
