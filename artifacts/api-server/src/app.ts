import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import compression from "compression";
import pinoHttp from "pino-http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import router from "./routes";
import { logger } from "./lib/logger";
import { injectSeo } from "./lib/seoInject.js";

const app: Express = express();

app.disable("x-powered-by");
app.set("etag", "strong");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(compression());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

const seoRewrites: Record<string, string> = {
  "/sitemap.xml": "/api/sitemap.xml",
  "/robots.txt": "/api/robots.txt",
  "/feed.xml": "/api/feed.xml",
};

app.use((req: Request, _res: Response, next: NextFunction) => {
  const rewrite = seoRewrites[req.path];
  if (rewrite) {
    req.url = rewrite + (req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "");
  }
  next();
});

app.use("/api", router);

if (process.env["NODE_ENV"] === "production") {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, "../../shopee-affiliate/dist/public"),
    path.resolve(here, "../shopee-affiliate/dist/public"),
    path.resolve(process.cwd(), "artifacts/shopee-affiliate/dist/public"),
  ];
  const staticDir = candidates.find((p) => fs.existsSync(p));

  if (staticDir) {
    logger.info({ staticDir }, "Serving static frontend");
    app.use(
      express.static(staticDir, {
        index: false,
        maxAge: "1h",
        setHeaders: (res, filePath) => {
          if (/\.(js|css|woff2?|png|jpe?g|svg|webp|ico)$/i.test(filePath)) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }
        },
      }),
    );

    const indexFile = path.join(staticDir, "index.html");
    // Cache template di memori (re-baca otomatis saat berubah via fs.statSync mtime)
    let cachedTemplate: { html: string; mtime: number } | null = null;
    function loadTemplate(): string {
      const mtime = fs.statSync(indexFile).mtimeMs;
      if (!cachedTemplate || cachedTemplate.mtime !== mtime) {
        cachedTemplate = { html: fs.readFileSync(indexFile, "utf8"), mtime };
      }
      return cachedTemplate.html;
    }

    app.get(/^(?!\/api\/).*/, async (req, res, next) => {
      try {
        const html = loadTemplate();
        const result = await injectSeo(html, req.path, req);
        res.status(result.status);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        res.send(result.html);
      } catch (err) {
        next(err);
      }
    });
  } else {
    logger.warn({ candidates }, "Static frontend dir not found");
  }
}

export default app;
