import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "shopee_recently_viewed_v1";
const MAX_ITEMS = 12;

function readStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeStorage(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent("recently-viewed:change"));
  } catch {
    // ignore quota errors
  }
}

export function useRecentlyViewed() {
  const [ids, setIds] = useState<string[]>(() => readStorage());

  useEffect(() => {
    const handler = () => setIds(readStorage());
    window.addEventListener("recently-viewed:change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("recently-viewed:change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const track = useCallback((id: string) => {
    if (!id) return;
    const current = readStorage();
    const next = [id, ...current.filter((x) => x !== id)].slice(0, MAX_ITEMS);
    writeStorage(next);
    setIds(next);
  }, []);

  const clear = useCallback(() => {
    writeStorage([]);
    setIds([]);
  }, []);

  return { ids, count: ids.length, max: MAX_ITEMS, track, clear };
}
