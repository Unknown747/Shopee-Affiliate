/**
 * Helper untuk inject/cleanup JSON-LD <script> di document.head.
 * Idempotent: panggilan kedua dengan id yang sama akan replace isi script.
 */

export function setJsonLd(id: string, data: Record<string, unknown>) {
  if (typeof document === "undefined") return;
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function removeJsonLd(id: string) {
  if (typeof document === "undefined") return;
  document.getElementById(id)?.remove();
}

/** Pasang ItemList schema dari array produk (dipakai di Home & SearchPage). */
export function setItemListLd(
  id: string,
  items: Array<{ slug: string; name: string; imageUrl?: string | null }>,
  baseUrl?: string,
) {
  if (items.length === 0) {
    removeJsonLd(id);
    return;
  }
  const origin =
    baseUrl ?? (typeof window !== "undefined" ? window.location.origin : "");
  setJsonLd(id, {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${origin}/product/${p.slug}`,
      name: p.name,
      ...(p.imageUrl ? { image: p.imageUrl } : {}),
    })),
  });
}
