import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, settingsTable } from "@workspace/db/schema";
import { eq, and, desc, or, sql } from "drizzle-orm";
import {
  AdminListProductsQueryParams,
  AdminLoginBody,
  UpsertSettingBody,
} from "@workspace/api-zod";
import jwt from "jsonwebtoken";

const router = Router();

const SESSION_SECRET = process.env["SESSION_SECRET"] || "default-secret-change-this";
const ADMIN_USERNAME = process.env["ADMIN_USERNAME"] || "admin";
const ADMIN_PASSWORD = process.env["ADMIN_PASSWORD"] || "admin123";

router.post("/admin/login", async (req, res) => {
  try {
    const body = AdminLoginBody.parse(req.body);

    if (body.username !== ADMIN_USERNAME || body.password !== ADMIN_PASSWORD) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Username atau password salah",
      });
    }

    const token = jwt.sign(
      { username: body.username, role: "admin" },
      SESSION_SECRET,
      { expiresIn: "7d" },
    );

    return res.json({
      success: true,
      token,
      message: "Login berhasil",
    });
  } catch (err) {
    req.log.error({ err }, "Error during admin login");
    return res.status(500).json({ error: "Login failed" });
  }
});

function verifyAdminToken(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization as string | undefined;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized", message: "Token diperlukan" });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, SESSION_SECRET) as { role: string };
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized", message: "Token tidak valid" });
  }
}

router.get("/admin/products", verifyAdminToken, async (req, res) => {
  try {
    const { page, limit, status } = AdminListProductsQueryParams.parse(req.query);
    const offset = (page - 1) * limit;

    const conditions = [];
    if (status !== "all") {
      conditions.push(eq(productsTable.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [products, totalResult] = await Promise.all([
      db
        .select()
        .from(productsTable)
        .where(whereClause)
        .orderBy(desc(productsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(productsTable)
        .where(whereClause),
    ]);

    const total = Number(totalResult[0]?.count ?? 0);
    return res.json({
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    req.log.error({ err }, "Error listing admin products");
    return res.status(500).json({ error: "Failed to list products" });
  }
});

router.get("/admin/settings", verifyAdminToken, async (req, res) => {
  try {
    const settings = await db
      .select()
      .from(settingsTable)
      .orderBy(settingsTable.key);
    return res.json(settings);
  } catch (err) {
    req.log.error({ err }, "Error getting settings");
    return res.status(500).json({ error: "Failed to get settings" });
  }
});

/* ---------- SEO Audit -------------------------------------------------- *
 * Audit semua produk published & laporkan field SEO yang kosong/lemah.
 *
 * Severity:
 *   high   — blocking issue (no meta title/desc/image)
 *   medium — content richness (no faq/pros-cons/review)
 *   low    — best-practice (length / category / tags)
 *
 * Score per produk: 100 - (high*20 + medium*8 + low*3), min 0.
 * ----------------------------------------------------------------------- */

const ISSUE_SEVERITY: Record<string, "high" | "medium" | "low"> = {
  missingMetaTitle: "high",
  missingMetaDesc: "high",
  missingImage: "high",
  noFaq: "medium",
  noProsCons: "medium",
  shortReview: "medium",
  noCategory: "medium",
  noTags: "low",
  shortName: "low",
  longMetaTitle: "low",
  shortMetaTitle: "low",
  longMetaDesc: "low",
  shortMetaDesc: "low",
};

const ISSUE_LABELS: Record<string, string> = {
  missingMetaTitle: "Meta title kosong",
  missingMetaDesc: "Meta description kosong",
  missingImage: "Tidak ada gambar produk",
  noFaq: "Belum ada FAQ",
  noProsCons: "Belum ada Pros & Cons",
  shortReview: "Review terlalu pendek (<100 karakter)",
  noCategory: "Kategori belum diisi",
  noTags: "Tidak ada tags",
  shortName: "Nama produk terlalu pendek (<30 karakter)",
  longMetaTitle: "Meta title terlalu panjang (>60 karakter)",
  shortMetaTitle: "Meta title terlalu pendek (<30 karakter)",
  longMetaDesc: "Meta description terlalu panjang (>160 karakter)",
  shortMetaDesc: "Meta description terlalu pendek (<100 karakter)",
};

interface AuditedProduct {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  category: string | null;
  status: string;
  issues: string[];
  score: number;
  worstSeverity: "high" | "medium" | "low" | "none";
}

router.get("/admin/seo-audit", verifyAdminToken, async (req, res) => {
  try {
    const products = await db
      .select({
        id: productsTable.id,
        slug: productsTable.slug,
        name: productsTable.name,
        imageUrl: productsTable.imageUrl,
        category: productsTable.category,
        tags: productsTable.tags,
        metaTitle: productsTable.metaTitle,
        metaDesc: productsTable.metaDesc,
        reviewContent: productsTable.reviewContent,
        pros: productsTable.pros,
        cons: productsTable.cons,
        faq: productsTable.faq,
        status: productsTable.status,
      })
      .from(productsTable)
      .where(eq(productsTable.status, "published"))
      .orderBy(desc(productsTable.lastUpdated));

    const audited: AuditedProduct[] = products.map((p) => {
      const issues: string[] = [];

      // High severity
      if (!p.metaTitle || p.metaTitle.trim().length < 10) issues.push("missingMetaTitle");
      if (!p.metaDesc || p.metaDesc.trim().length < 50) issues.push("missingMetaDesc");
      if (!p.imageUrl || p.imageUrl.trim().length === 0) issues.push("missingImage");

      // Medium severity
      if (!p.faq || p.faq.length === 0) issues.push("noFaq");
      if ((!p.pros || p.pros.length === 0) && (!p.cons || p.cons.length === 0)) {
        issues.push("noProsCons");
      }
      if (!p.reviewContent || p.reviewContent.trim().length < 100) {
        issues.push("shortReview");
      }
      if (!p.category || p.category.trim().length === 0) issues.push("noCategory");

      // Low severity
      if (!p.tags || p.tags.length === 0) issues.push("noTags");
      if (p.name.trim().length < 30) issues.push("shortName");
      if (p.metaTitle && p.metaTitle.length > 60) issues.push("longMetaTitle");
      if (p.metaTitle && p.metaTitle.length >= 10 && p.metaTitle.length < 30)
        issues.push("shortMetaTitle");
      if (p.metaDesc && p.metaDesc.length > 160) issues.push("longMetaDesc");
      if (p.metaDesc && p.metaDesc.length >= 50 && p.metaDesc.length < 100)
        issues.push("shortMetaDesc");

      // Score
      let penalty = 0;
      let worstSeverity: "high" | "medium" | "low" | "none" = "none";
      for (const k of issues) {
        const sev = ISSUE_SEVERITY[k];
        if (sev === "high") {
          penalty += 20;
          worstSeverity = "high";
        } else if (sev === "medium") {
          penalty += 8;
          if (worstSeverity !== "high") worstSeverity = "medium";
        } else if (sev === "low") {
          penalty += 3;
          if (worstSeverity === "none") worstSeverity = "low";
        }
      }
      const score = Math.max(0, 100 - penalty);

      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        imageUrl: p.imageUrl,
        category: p.category,
        status: p.status,
        issues,
        score,
        worstSeverity,
      };
    });

    // Summary counts
    const summary = {
      total: audited.length,
      perfect: audited.filter((p) => p.issues.length === 0).length,
      high: audited.filter((p) => p.worstSeverity === "high").length,
      medium: audited.filter((p) => p.worstSeverity === "medium").length,
      low: audited.filter((p) => p.worstSeverity === "low").length,
      avgScore:
        audited.length === 0
          ? 100
          : Math.round(
              audited.reduce((acc, p) => acc + p.score, 0) / audited.length,
            ),
      issueCounts: Object.keys(ISSUE_SEVERITY).reduce<Record<string, number>>(
        (acc, k) => {
          acc[k] = audited.filter((p) => p.issues.includes(k)).length;
          return acc;
        },
        {},
      ),
    };

    res.set("Cache-Control", "no-store");
    return res.json({
      summary,
      labels: ISSUE_LABELS,
      severities: ISSUE_SEVERITY,
      products: audited,
    });
  } catch (err) {
    req.log.error({ err }, "Error generating SEO audit");
    return res.status(500).json({ error: "Failed to generate SEO audit" });
  }
});

router.post("/admin/settings", verifyAdminToken, async (req, res) => {
  try {
    const body = UpsertSettingBody.parse(req.body);
    const { invalidateSettingsCache } = await import("../lib/settingsCache.js");
    invalidateSettingsCache();

    const existing = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, body.key))
      .limit(1);

    let setting;
    if (existing[0]) {
      const updated = await db
        .update(settingsTable)
        .set({ value: body.value, description: body.description, updatedAt: new Date() })
        .where(eq(settingsTable.key, body.key))
        .returning();
      setting = updated[0];
    } else {
      const inserted = await db
        .insert(settingsTable)
        .values({
          key: body.key,
          value: body.value,
          description: body.description,
        })
        .returning();
      setting = inserted[0];
    }

    return res.json(setting);
  } catch (err) {
    req.log.error({ err }, "Error upserting setting");
    return res.status(500).json({ error: "Failed to save setting" });
  }
});

export default router;
