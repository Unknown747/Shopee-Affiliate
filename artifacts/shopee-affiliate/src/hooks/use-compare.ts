import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "shopee_compare_v1";
const MAX_COMPARE = 4;

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
    window.dispatchEvent(new CustomEvent("compare:change"));
  } catch {
    // ignore quota errors
  }
}

export function useCompare() {
  const [ids, setIds] = useState<string[]>(() => readStorage());

  useEffect(() => {
    const handler = () => setIds(readStorage());
    window.addEventListener("compare:change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("compare:change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const isInCompare = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback((id: string) => {
    const current = readStorage();
    if (current.includes(id)) {
      const next = current.filter((x) => x !== id);
      writeStorage(next);
      setIds(next);
      return { added: false, full: false };
    }
    if (current.length >= MAX_COMPARE) {
      return { added: false, full: true };
    }
    const next = [...current, id];
    writeStorage(next);
    setIds(next);
    return { added: true, full: false };
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

  return { ids, count: ids.length, max: MAX_COMPARE, isInCompare, toggle, remove, clear };
}
