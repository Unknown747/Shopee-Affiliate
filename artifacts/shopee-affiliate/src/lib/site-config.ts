import { useQuery } from "@tanstack/react-query";

const API_BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

export type SiteConfig = Partial<{
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
