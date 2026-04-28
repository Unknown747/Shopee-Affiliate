import crypto from "crypto";
import { logger } from "../lib/logger.js";

const SHOPEE_PARTNER_ID = process.env["SHOPEE_PARTNER_ID"] || "";
const SHOPEE_PARTNER_KEY = process.env["SHOPEE_PARTNER_KEY"] || "";
const SHOPEE_API_URL =
  process.env["SHOPEE_API_URL"] ||
  "https://open-api.affiliate.shopee.com/graphql";

export interface ShopeeProductInfo {
  shopeeId: string;
  name: string;
  price: number;
  priceBeforeDisc?: number;
  commission?: number;
  commissionRate?: number;
  imageUrl: string;
  images?: string[];
  shopName?: string;
  shopRating?: number;
  ratingStar?: number;
  soldCount?: number;
  category?: string;
  affiliateLink: string;
}

function generateSignature(payload: string, timestamp: number): string {
  const signString = `${SHOPEE_PARTNER_ID}${timestamp}${payload}`;
  return crypto
    .createHmac("sha256", SHOPEE_PARTNER_KEY)
    .update(signString)
    .digest("hex");
}

export async function generateAffiliateLink(
  originalUrl: string,
): Promise<ShopeeProductInfo> {
  if (!SHOPEE_PARTNER_ID || !SHOPEE_PARTNER_KEY) {
    logger.warn("Shopee API credentials not configured, using mock data");
    return generateMockProduct(originalUrl);
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const query = `
    mutation generateShortLink {
      generateShortLink(input: {
        originUrl: "${originalUrl}",
        subIds: ["affiliate_website"]
      }) {
        shortLink
        offerLink
        commissionRate
        commission
      }
    }
  `;

  const signature = generateSignature(query, timestamp);

  try {
    const response = await fetch(SHOPEE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `SHA256 Credential=${SHOPEE_PARTNER_ID}, Timestamp=${timestamp}, Signature=${signature}`,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Shopee API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      data?: {
        generateShortLink?: {
          offerLink?: string;
          commissionRate?: number;
          commission?: number;
        };
      };
    };

    if (!data?.data?.generateShortLink?.offerLink) {
      throw new Error("Failed to generate affiliate link from Shopee API");
    }

    const affiliateData = data.data.generateShortLink;

    const productInfo = await fetchProductInfo(originalUrl);

    return {
      ...productInfo,
      affiliateLink: affiliateData.offerLink || originalUrl,
      commissionRate: affiliateData.commissionRate,
      commission: affiliateData.commission
        ? Math.round(affiliateData.commission * 100)
        : undefined,
    };
  } catch (err) {
    logger.warn({ err }, "Shopee API call failed, using mock data");
    return generateMockProduct(originalUrl);
  }
}

async function fetchProductInfo(url: string): Promise<Omit<ShopeeProductInfo, "affiliateLink">> {
  try {
    const productIdMatch = url.match(/i\.(\d+)\.(\d+)/);
    const shopId = productIdMatch?.[1] || "12345";
    const itemId = productIdMatch?.[2] || "67890";

    return {
      shopeeId: `${shopId}_${itemId}`,
      name: "Produk Shopee",
      price: 100000,
      imageUrl: `https://cf.shopee.co.id/file/placeholder`,
      category: "Umum",
    };
  } catch {
    return {
      shopeeId: `mock_${Date.now()}`,
      name: "Produk Shopee",
      price: 100000,
      imageUrl: "https://cf.shopee.co.id/file/placeholder",
      category: "Umum",
    };
  }
}

function generateMockProduct(url: string): ShopeeProductInfo {
  const productIdMatch = url.match(/i\.(\d+)\.(\d+)/);
  const shopId = productIdMatch?.[1] || String(Math.floor(Math.random() * 999999));
  const itemId = productIdMatch?.[2] || String(Math.floor(Math.random() * 999999999));

  const mockProducts = [
    {
      name: "Xiaomi Redmi Note 13 Pro 5G 8/256GB",
      price: 3499000,
      priceBeforeDisc: 4299000,
      category: "Handphone & Tablet",
      commissionRate: 3.5,
      commission: 122465,
      shopName: "Xiaomi Official Store",
      shopRating: 4.9,
      ratingStar: 4.8,
      soldCount: 15234,
    },
    {
      name: "Sepatu Lari Nike Air Zoom Pegasus 40",
      price: 1299000,
      priceBeforeDisc: 1799000,
      category: "Pakaian & Sepatu",
      commissionRate: 4.0,
      commission: 51960,
      shopName: "Nike Official Indonesia",
      shopRating: 4.8,
      ratingStar: 4.7,
      soldCount: 8921,
    },
    {
      name: "Laptop ASUS VivoBook 14 AMD Ryzen 5",
      price: 6999000,
      priceBeforeDisc: 8500000,
      category: "Komputer & Laptop",
      commissionRate: 2.5,
      commission: 174975,
      shopName: "ASUS Official Store",
      shopRating: 4.9,
      ratingStar: 4.6,
      soldCount: 3421,
    },
  ];

  const mock = mockProducts[Math.floor(Math.random() * mockProducts.length)] || mockProducts[0]!;

  return {
    shopeeId: `${shopId}_${itemId}`,
    name: mock.name,
    price: mock.price,
    priceBeforeDisc: mock.priceBeforeDisc,
    commission: mock.commission,
    commissionRate: mock.commissionRate,
    imageUrl: `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop`,
    shopName: mock.shopName,
    shopRating: mock.shopRating,
    ratingStar: mock.ratingStar,
    soldCount: mock.soldCount,
    category: mock.category,
    affiliateLink: `https://shope.ee/mock_${Date.now()}`,
  };
}
