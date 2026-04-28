import NodeCache from "node-cache";

const cache = new NodeCache({
  stdTTL: 3600,
  checkperiod: 600,
  useClones: false,
});

export function getCached<T>(key: string): T | undefined {
  return cache.get<T>(key);
}

export function setCached<T>(key: string, value: T, ttl?: number): void {
  if (ttl !== undefined) {
    cache.set(key, value, ttl);
  } else {
    cache.set(key, value);
  }
}

export function deleteCached(key: string): void {
  cache.del(key);
}

export function flushCache(): void {
  cache.flushAll();
}

export function deleteCachedByPattern(pattern: string): void {
  const keys = cache.keys();
  for (const key of keys) {
    if (key.includes(pattern)) {
      cache.del(key);
    }
  }
}
