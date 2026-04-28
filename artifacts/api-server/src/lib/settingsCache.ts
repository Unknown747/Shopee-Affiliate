import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db/schema";
import { logger } from "./logger.js";

const CACHE_TTL_MS = 30_000;

let cache: Record<string, string> = {};
let cacheLoadedAt = 0;
let inflight: Promise<void> | null = null;

async function refresh(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const rows = await db
        .select({ key: settingsTable.key, value: settingsTable.value })
        .from(settingsTable);
      const next: Record<string, string> = {};
      for (const r of rows) {
        if (r.value != null) next[r.key] = r.value;
      }
      cache = next;
      cacheLoadedAt = Date.now();
    } catch (err) {
      logger.warn({ err }, "settingsCache: refresh failed");
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

async function ensureFresh(): Promise<void> {
  if (Date.now() - cacheLoadedAt > CACHE_TTL_MS) {
    await refresh();
  }
}

export async function getSetting(
  key: string,
  fallback = "",
): Promise<string> {
  await ensureFresh();
  return cache[key] ?? fallback;
}

export async function getSettingsMap(
  keys: string[],
): Promise<Record<string, string>> {
  await ensureFresh();
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = cache[k] ?? "";
  return out;
}

export function invalidateSettingsCache(): void {
  cacheLoadedAt = 0;
}
