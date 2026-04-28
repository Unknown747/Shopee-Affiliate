import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "shopee_wishlist_v1";

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
    window.dispatchEvent(new CustomEvent("wishlist:change"));
  } catch {
    // ignore quota errors
  }
}

export function useWishlist() {
  const [ids, setIds] = useState<string[]>(() => readStorage());

  useEffect(() => {
    const handler = () => setIds(readStorage());
    window.addEventListener("wishlist:change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("wishlist:change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const isInWishlist = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback((id: string) => {
    const current = readStorage();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    writeStorage(next);
    setIds(next);
  }, []);

  const remove = useCallback((id: string) => {
    const next = readStorage().filter((x) => x !== id);
    writeStorage(next);
    setIds(next);
  }, []);

  const clear = useCallback(() => {
    writeStorage([]);
    setIds([]);
  }, []);

  return { ids, count: ids.length, isInWishlist, toggle, remove, clear };
}
