import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable(
  "products",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    shopeeId: text("shopee_id").notNull().unique(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    price: integer("price").notNull(),
    priceBeforeDisc: integer("price_before_disc"),
    commission: integer("commission"),
    commissionRate: real("commission_rate"),
    imageUrl: text("image_url").notNull(),
    images: jsonb("images").$type<string[]>(),
    shopName: text("shop_name"),
    shopRating: real("shop_rating"),
    ratingStar: real("rating_star"),
    soldCount: integer("sold_count"),
    category: text("category"),
    tags: jsonb("tags").$type<string[]>(),
    affiliateLink: text("affiliate_link").notNull(),
    reviewContent: text("review_content"),
    pros: jsonb("pros").$type<string[]>(),
    cons: jsonb("cons").$type<string[]>(),
    faq: jsonb("faq").$type<Array<{ question: string; answer: string }>>(),
    metaTitle: text("meta_title"),
    metaDesc: text("meta_desc"),
    viewCount: integer("view_count").notNull().default(0),
    clickCount: integer("click_count").notNull().default(0),
    conversionCount: integer("conversion_count").notNull().default(0),
    status: text("status").notNull().default("draft"),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => [
    index("idx_products_status").on(table.status),
    index("idx_products_category").on(table.category),
    index("idx_products_status_created").on(table.status, table.createdAt),
    index("idx_products_status_clicks").on(table.status, table.clickCount),
    index("idx_products_status_rating").on(table.status, table.ratingStar),
    index("idx_products_status_price").on(table.status, table.price),
  ],
);

export const clickLogsTable = pgTable(
  "click_logs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    productId: text("product_id").notNull(),
    ipHash: text("ip_hash").notNull(),
    userAgent: text("user_agent"),
    referer: text("referer"),
    clickedAt: timestamp("clicked_at").notNull().defaultNow(),
  },
  (table) => [index("idx_click_logs_product_id").on(table.productId), index("idx_click_logs_clicked_at").on(table.clickedAt)],
);

export const productPriceHistoryTable = pgTable(
  "product_price_history",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    productId: text("product_id").notNull(),
    price: integer("price").notNull(),
    priceBeforeDisc: integer("price_before_disc"),
    recordedAt: timestamp("recorded_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_pph_product_id").on(table.productId),
    index("idx_pph_product_recorded").on(table.productId, table.recordedAt),
  ],
);

export const articlesTable = pgTable(
  "articles",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    content: text("content").notNull(),
    coverImage: text("cover_image"),
    category: text("category"),
    tags: jsonb("tags").$type<string[]>(),
    author: text("author").default("Tim ShopeeRecommend"),
    metaTitle: text("meta_title"),
    metaDesc: text("meta_desc"),
    status: text("status").notNull().default("draft"),
    viewCount: integer("view_count").notNull().default(0),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_articles_status").on(table.status),
    index("idx_articles_status_published").on(table.status, table.publishedAt),
    index("idx_articles_category").on(table.category),
  ],
);

export const promosTable = pgTable(
  "promos",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    bannerImage: text("banner_image"),
    tag: text("tag"),
    ctaText: text("cta_text").default("Lihat Produk"),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    status: text("status").notNull().default("draft"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_promos_status").on(table.status),
    index("idx_promos_status_dates").on(table.status, table.startDate, table.endDate),
  ],
);

export const settingsTable = pgTable("settings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text("key").notNull().unique(),
  value: text("value"),
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  viewCount: true,
  clickCount: true,
  conversionCount: true,
  createdAt: true,
  lastUpdated: true,
});

export const insertSettingSchema = createInsertSchema(settingsTable).omit({
  id: true,
  updatedAt: true,
});

export const insertArticleSchema = createInsertSchema(articlesTable).omit({
  id: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPromoSchema = createInsertSchema(promosTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Product = typeof productsTable.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type ClickLog = typeof clickLogsTable.$inferSelect;
export type Setting = typeof settingsTable.$inferSelect;
export type Article = typeof articlesTable.$inferSelect;
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Promo = typeof promosTable.$inferSelect;
export type InsertPromo = z.infer<typeof insertPromoSchema>;
