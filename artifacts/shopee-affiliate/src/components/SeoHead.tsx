import { useEffect } from "react";
import { useSiteConfig, applyTemplate } from "@/lib/site-config";

interface SeoHeadProps {
  title: string;
  description?: string;
  image?: string;
  type?: "website" | "article" | "product";
  noindex?: boolean;
  /** Path only, e.g. "/product/foo". If omitted, uses current pathname. */
  path?: string;
}

function setMeta(
  selector: string,
  attr: "name" | "property",
  key: string,
  content: string,
) {
  if (!content) return;
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
  el.setAttribute("data-managed", "seo");
}

function setLink(rel: string, href: string) {
  if (!href) return;
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
  el.setAttribute("data-managed", "seo");
}

export function SeoHead({
  title,
  description,
  image,
  type = "website",
  noindex = false,
  path,
}: SeoHeadProps) {
  const { data: config } = useSiteConfig();

  useEffect(() => {
    if (!title) return;

    const cfg = config ?? {};
    const fullTitle = applyTemplate(cfg.meta_title_template, title);
    document.title = fullTitle;

    const desc = description || cfg.default_meta_desc || "";
    setMeta("", "name", "description", desc);
    if (cfg.default_meta_keywords) {
      setMeta("", "name", "keywords", cfg.default_meta_keywords);
    }
    setMeta(
      "",
      "name",
      "robots",
      noindex ? "noindex,nofollow" : "index,follow",
    );

    // Canonical URL
    const base =
      cfg.canonical_base_url?.replace(/\/$/, "") ||
      (typeof window !== "undefined" ? window.location.origin : "");
    const currentPath =
      path ?? (typeof window !== "undefined" ? window.location.pathname : "/");
    const canonical = `${base}${currentPath}`;
    setLink("canonical", canonical);

    // Open Graph
    const ogImage = image || cfg.og_default_image || "";
    setMeta("", "property", "og:type", type);
    setMeta("", "property", "og:title", fullTitle);
    setMeta("", "property", "og:description", desc);
    setMeta("", "property", "og:url", canonical);
    setMeta(
      "",
      "property",
      "og:site_name",
      cfg.og_site_name || cfg.schema_org_name || "ShopeeRecommend",
    );
    setMeta("", "property", "og:locale", cfg.og_locale || "id_ID");
    if (ogImage) {
      setMeta("", "property", "og:image", ogImage);
      setMeta("", "property", "og:image:alt", title);
    }
    if (cfg.facebook_app_id) {
      setMeta("", "property", "fb:app_id", cfg.facebook_app_id);
    }

    // Twitter
    setMeta(
      "",
      "name",
      "twitter:card",
      cfg.twitter_card_type || "summary_large_image",
    );
    setMeta("", "name", "twitter:title", fullTitle);
    setMeta("", "name", "twitter:description", desc);
    if (ogImage) setMeta("", "name", "twitter:image", ogImage);
    if (cfg.twitter_site_username) {
      setMeta("", "name", "twitter:site", `@${cfg.twitter_site_username}`);
    }
    if (cfg.twitter_creator_username) {
      setMeta(
        "",
        "name",
        "twitter:creator",
        `@${cfg.twitter_creator_username}`,
      );
    }
  }, [title, description, image, type, noindex, path, config]);

  return null;
}
