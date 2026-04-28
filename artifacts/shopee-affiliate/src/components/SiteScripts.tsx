import { useEffect } from "react";
import { useSiteConfig, resolveBrand, hexToHslString } from "@/lib/site-config";

function ensureMeta(name: string, content: string) {
  if (!content) return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function ensureExternalScript(id: string, src: string, async = true) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.async = async;
  s.src = src;
  document.head.appendChild(s);
}

function ensureInlineScript(id: string, code: string) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.text = code;
  document.head.appendChild(s);
}

export function SiteScripts() {
  const { data: config } = useSiteConfig();

  // Apply brand identity (favicon, primary color, theme-color) as soon as config arrives
  useEffect(() => {
    const brand = resolveBrand(config);

    // Favicon
    if (brand.faviconUrl) {
      let link = document.head.querySelector<HTMLLinkElement>(
        'link[rel="icon"]',
      );
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = brand.faviconUrl;
      link.type = brand.faviconUrl.endsWith(".svg")
        ? "image/svg+xml"
        : brand.faviconUrl.endsWith(".png")
          ? "image/png"
          : brand.faviconUrl.endsWith(".ico")
            ? "image/x-icon"
            : "";
    }

    // Primary color → CSS var (HSL) + theme-color meta
    const hsl = hexToHslString(brand.primaryColor);
    if (hsl) {
      document.documentElement.style.setProperty("--primary", hsl);
    }
    let tc = document.head.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    if (!tc) {
      tc = document.createElement("meta");
      tc.setAttribute("name", "theme-color");
      document.head.appendChild(tc);
    }
    tc.setAttribute("content", brand.primaryColor);
  }, [config]);

  useEffect(() => {
    if (!config) return;

    // Verification meta tags
    if (config.google_sc_verification) {
      ensureMeta("google-site-verification", config.google_sc_verification);
    }
    if (config.bing_verification) {
      ensureMeta("msvalidate.01", config.bing_verification);
    }
    if (config.yandex_verification) {
      ensureMeta("yandex-verification", config.yandex_verification);
    }
    if (config.pinterest_verification) {
      ensureMeta("p:domain_verify", config.pinterest_verification);
    }

    // Google Analytics 4
    if (config.ga4_measurement_id) {
      ensureExternalScript(
        "ga4-loader",
        `https://www.googletagmanager.com/gtag/js?id=${config.ga4_measurement_id}`,
      );
      ensureInlineScript(
        "ga4-init",
        `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${config.ga4_measurement_id}', { anonymize_ip: true });`,
      );
    }

    // Google Ads
    if (config.google_ads_tag_id) {
      ensureExternalScript(
        "gads-loader",
        `https://www.googletagmanager.com/gtag/js?id=${config.google_ads_tag_id}`,
      );
      ensureInlineScript(
        "gads-init",
        `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = window.gtag || gtag;
gtag('js', new Date());
gtag('config', '${config.google_ads_tag_id}');`,
      );
    }

    // Meta Pixel
    if (config.meta_pixel_id) {
      ensureInlineScript(
        "meta-pixel",
        `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${config.meta_pixel_id}');
fbq('track', 'PageView');`,
      );
    }

    // TikTok Pixel
    if (config.tiktok_pixel_id) {
      ensureInlineScript(
        "tiktok-pixel",
        `!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
  ttq.load('${config.tiktok_pixel_id}');
  ttq.page();
}(window, document, 'ttq');`,
      );
    }
  }, [config]);

  // Track route changes for GA4 / pixels (lightweight: re-fire pageview on path change)
  useEffect(() => {
    if (!config) return;
    let lastPath = window.location.pathname + window.location.search;
    const fire = () => {
      const path = window.location.pathname + window.location.search;
      if (path === lastPath) return;
      lastPath = path;
      const w = window as unknown as {
        gtag?: (...args: unknown[]) => void;
        fbq?: (...args: unknown[]) => void;
        ttq?: { page?: () => void };
      };
      if (config.ga4_measurement_id && w.gtag) {
        w.gtag("event", "page_view", { page_path: path });
      }
      if (config.meta_pixel_id && w.fbq) {
        w.fbq("track", "PageView");
      }
      if (config.tiktok_pixel_id && w.ttq?.page) {
        w.ttq.page();
      }
    };
    const id = setInterval(fire, 800);
    return () => clearInterval(id);
  }, [config]);

  return null;
}
