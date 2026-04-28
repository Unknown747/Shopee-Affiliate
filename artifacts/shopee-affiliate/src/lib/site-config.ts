import { useQuery } from "@tanstack/react-query";

const API_BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

export type SiteConfig = Partial<{
  brand_name: string;
  brand_tagline: string;
  brand_logo_url: string;
  brand_favicon_url: string;
  brand_primary_color: string;
  brand_footer_text: string;
  google_sc_verification: string;
  bing_verification: string;
  yandex_verification: string;
  pinterest_verification: string;
  facebook_app_id: string;
  ga4_measurement_id: string;
  google_ads_tag_id: string;
  meta_pixel_id: string;
  tiktok_pixel_id: string;
  og_site_name: string;
  og_default_image: string;
  og_locale: string;
  twitter_card_type: string;
  twitter_site_username: string;
  twitter_creator_username: string;
  canonical_base_url: string;
  meta_title_template: string;
  default_meta_desc: string;
  default_meta_keywords: string;
  schema_org_name: string;
  schema_org_logo: string;
  schema_org_url: string;
  schema_org_type: string;
  schema_site_desc: string;
  schema_contact_email: string;
}>;

export const BRAND_DEFAULT = {
  name: "ShopeeRecommend",
  tagline:
    "Rekomendasi produk Shopee terbaik, dikurasi objektif untuk membantu Anda berbelanja lebih cerdas dan hemat.",
  primaryColor: "#ee4d2d",
  footerText: "Dibuat dengan hati untuk pembelanja Indonesia.",
} as const;

/**
 * Resolve effective brand values from site config, with sensible fallbacks
 * to legacy keys (og_site_name / schema_org_name) and finally a default.
 */
export function resolveBrand(cfg: SiteConfig | undefined) {
  const c = cfg ?? {};
  const name =
    c.brand_name?.trim() ||
    c.og_site_name?.trim() ||
    c.schema_org_name?.trim() ||
    BRAND_DEFAULT.name;
  return {
    name,
    tagline: c.brand_tagline?.trim() || BRAND_DEFAULT.tagline,
    logoUrl: c.brand_logo_url?.trim() || "",
    faviconUrl: c.brand_favicon_url?.trim() || "",
    primaryColor: c.brand_primary_color?.trim() || BRAND_DEFAULT.primaryColor,
    footerText: c.brand_footer_text?.trim() || BRAND_DEFAULT.footerText,
  };
}

/** Convert "#rrggbb" or "rgb(...)" to "h s% l%" string usable as a CSS variable for HSL color. */
export function hexToHslString(input: string): string | null {
  if (!input) return null;
  let r = 0,
    g = 0,
    b = 0;
  const hex = input.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    r = parseInt(hex[0]! + hex[0], 16);
    g = parseInt(hex[1]! + hex[1], 16);
    b = parseInt(hex[2]! + hex[2], 16);
  } else if (/^[0-9a-f]{6}$/i.test(hex)) {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else {
    const m = input.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (!m) return null;
    r = Number(m[1]);
    g = Number(m[2]);
    b = Number(m[3]);
  }
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn),
    min = Math.min(rn, gn, bn);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    switch (max) {
      case rn:
        h = ((gn - bn) / d) % 6;
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      case bn:
        h = (rn - gn) / d + 4;
        break;
    }
    h = h * 60;
    if (h < 0) h += 360;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function useSiteConfig() {
  return useQuery<SiteConfig>({
    queryKey: ["site-config"],
    queryFn: async () => {
      const r = await fetch(`${API_BASE}/api/site-config`);
      if (!r.ok) return {};
      return (await r.json()) as SiteConfig;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

export function applyTemplate(
  template: string | undefined,
  title: string,
): string {
  if (!template) return title;
  return template.includes("%s") ? template.replace("%s", title) : title;
}
