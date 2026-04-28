import type { Request, Response, NextFunction } from "express";

/**
 * Apply Cache-Control headers for public read endpoints.
 * - maxAge: browser cache (s)
 * - sMaxAge: shared/CDN cache (s) — defaults to 5x maxAge
 * - swr: stale-while-revalidate window (s) — defaults to 10x maxAge
 * Only applies on GET/HEAD with 2xx responses.
 */
export function httpCache(opts: { maxAge: number; sMaxAge?: number; swr?: number }) {
  const { maxAge } = opts;
  const sMaxAge = opts.sMaxAge ?? maxAge * 5;
  const swr = opts.swr ?? maxAge * 10;
  const value = `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`;

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    res.on("headersSent", () => {});
    const origJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300 && !res.getHeader("Cache-Control")) {
        res.setHeader("Cache-Control", value);
        const vary = res.getHeader("Vary");
        if (!vary) res.setHeader("Vary", "Accept-Encoding");
      }
      return origJson(body);
    }) as typeof res.json;
    next();
  };
}
