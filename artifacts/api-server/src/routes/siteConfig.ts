import { Router } from "express";
import { getSettingsMap } from "../lib/settingsCache.js";

const router = Router();

const PUBLIC_KEYS = [
  // Verification
  "google_sc_verification",
  "bing_verification",
  "yandex_verification",
  "pinterest_verification",
  "facebook_app_id",
  // Analytics
  "ga4_measurement_id",
  "google_ads_tag_id",
  "meta_pixel_id",
  "tiktok_pixel_id",
  // Open Graph / Twitter
  "og_site_name",
  "og_default_image",
  "og_locale",
  "twitter_card_type",
  "twitter_site_username",
  "twitter_creator_username",
  // SEO general
  "canonical_base_url",
  "meta_title_template",
  "default_meta_desc",
  "default_meta_keywords",
  // Schema.org
  "schema_org_name",
  "schema_org_logo",
  "schema_org_url",
  "schema_org_type",
  "schema_site_desc",
  "schema_contact_email",
];

router.get("/site-config", async (_req, res) => {
  try {
    const settings = await getSettingsMap(PUBLIC_KEYS);
    res.set("Cache-Control", "public, max-age=60, s-maxage=300");
    return res.json(settings);
  } catch {
    return res.json({});
  }
});

export default router;
