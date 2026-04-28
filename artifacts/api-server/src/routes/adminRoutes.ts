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

router.post("/admin/settings", verifyAdminToken, async (req, res) => {
  try {
    const body = UpsertSettingBody.parse(req.body);

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
