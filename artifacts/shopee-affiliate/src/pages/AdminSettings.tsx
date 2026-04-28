import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useGetSettings, useUpsertSetting } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Share2,
  Settings,
  Globe,
  CheckCircle2,
  ExternalLink,
  Code2,
  BarChart3,
  AlertCircle,
  Save,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

type SettingsMap = Record<string, string>;

function useSeoSettings() {
  const { data: rawSettings, isLoading, refetch } = useGetSettings();
  const [settings, setSettings] = useState<SettingsMap>({});
  const queryClient = useQueryClient();
  const upsertMutation = useUpsertSetting();
  const { toast } = useToast();

  useEffect(() => {
    if (rawSettings) {
      const map: SettingsMap = {};
      rawSettings.forEach((s) => {
        map[s.key] = s.value ?? "";
      });
      setSettings(map);
    }
  }, [rawSettings]);

  const set = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveSection = async (
    keys: Array<{ key: string; description: string }>,
    sectionName: string
  ) => {
    try {
      await Promise.all(
        keys.map(({ key, description }) =>
          upsertMutation.mutateAsync({
            data: { key, value: settings[key] ?? "", description },
          })
        )
      );
      await refetch();
      queryClient.invalidateQueries();
      toast({ title: `${sectionName} tersimpan!`, description: "Pengaturan berhasil disimpan." });
    } catch {
      toast({ title: "Gagal menyimpan", variant: "destructive" });
    }
  };

  return { settings, set, saveSection, isLoading, isSaving: upsertMutation.isPending };
}

function SectionHeader({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="bg-primary/10 rounded-lg p-2 mt-0.5">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold text-base">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function SettingField({
  label,
  settingKey,
  placeholder,
  description,
  type = "input",
  options,
  docsUrl,
  value,
  onChange,
}: {
  label: string;
  settingKey: string;
  placeholder?: string;
  description?: string;
  type?: "input" | "textarea" | "select";
  options?: { value: string; label: string }[];
  docsUrl?: string;
  value: string;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={settingKey} className="flex items-center gap-2">
          {label}
          {docsUrl && (
            <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </Label>
        {value && <CheckCircle2 className="h-4 w-4 text-green-500" />}
      </div>
      {type === "textarea" ? (
        <Textarea
          id={settingKey}
          value={value}
          onChange={(e) => onChange(settingKey, e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="font-mono text-sm"
        />
      ) : type === "select" && options ? (
        <Select value={value} onValueChange={(v) => onChange(settingKey, v)}>
          <SelectTrigger id={settingKey}>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={settingKey}
          value={value}
          onChange={(e) => onChange(settingKey, e.target.value)}
          placeholder={placeholder}
          className="font-mono"
        />
      )}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

export default function AdminSettings() {
  const { settings, set, saveSection, isLoading, isSaving } = useSeoSettings();

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Memuat pengaturan...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            Pengaturan SEO & API
          </h1>
          <p className="text-muted-foreground mt-1">
            Kelola semua API key dan konfigurasi optimasi SEO dari satu tempat
          </p>
        </div>

        <Tabs defaultValue="search-engines">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 h-auto gap-1 bg-muted p-1">
            <TabsTrigger value="search-engines" className="gap-1.5 text-xs">
              <Search className="h-3.5 w-3.5" /> Search Engine
            </TabsTrigger>
            <TabsTrigger value="social" className="gap-1.5 text-xs">
              <Share2 className="h-3.5 w-3.5" /> Social Media
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5 text-xs">
              <BarChart3 className="h-3.5 w-3.5" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="general-seo" className="gap-1.5 text-xs">
              <Globe className="h-3.5 w-3.5" /> SEO Umum
            </TabsTrigger>
            <TabsTrigger value="schema" className="gap-1.5 text-xs">
              <Code2 className="h-3.5 w-3.5" /> Schema.org
            </TabsTrigger>
          </TabsList>

          {/* ── SEARCH ENGINES ── */}
          <TabsContent value="search-engines" className="space-y-6 mt-6">
            {/* Google Search Console */}
            <Card>
              <CardHeader>
                <SectionHeader
                  icon={Search}
                  title="Google Search Console"
                  description="Verifikasi kepemilikan situs dan kirim sitemap ke Google."
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <SettingField
                  label="Verification Meta Tag (content value)"
                  settingKey="google_sc_verification"
                  placeholder="contoh: abcdefghijklmnop123456"
                  description='Nilai dari atribut content pada tag <meta name="google-site-verification" content="...">. Dapatkan dari Google Search Console → Verifikasi Kepemilikan → Tag HTML.'
                  docsUrl="https://search.google.com/search-console"
                  value={settings["google_sc_verification"] ?? ""}
                  onChange={set}
                />
                <SettingField
                  label="Sitemap URL (opsional)"
                  settingKey="google_sitemap_url"
                  placeholder="https://yourdomain.com/sitemap.xml"
                  description="URL sitemap XML untuk disubmit ke Google Search Console."
                  value={settings["google_sitemap_url"] ?? ""}
                  onChange={set}
                />
                <SettingField
                  label="Google Site Name (Knowledge Panel)"
                  settingKey="google_site_name"
                  placeholder="ShopeeRecommend"
                  description="Nama situs yang ditampilkan di Google Knowledge Panel."
                  value={settings["google_site_name"] ?? ""}
                  onChange={set}
                />
                <Button
                  onClick={() => saveSection([
                    { key: "google_sc_verification", description: "Google Search Console verification meta tag" },
                    { key: "google_sitemap_url", description: "Sitemap URL for Google Search Console" },
                    { key: "google_site_name", description: "Google site name" },
                  ], "Google Search Console")}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" /> Simpan Google SC
                </Button>
              </CardContent>
            </Card>

            {/* Bing Webmaster */}
            <Card>
              <CardHeader>
                <SectionHeader
                  icon={Search}
                  title="Bing Webmaster Tools"
                  description="Verifikasi situs di Bing dan kelola indeksasi."
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <SettingField
                  label="Verification Meta Tag (content value)"
                  settingKey="bing_verification"
                  placeholder="contoh: ABCDEF1234567890"
                  description='Nilai content dari <meta name="msvalidate.01" content="...">. Dapatkan dari Bing Webmaster Tools → Verifikasi Kepemilikan.'
                  docsUrl="https://www.bing.com/webmasters"
                  value={settings["bing_verification"] ?? ""}
                  onChange={set}
                />
                <Button
                  onClick={() => saveSection([
                    { key: "bing_verification", description: "Bing Webmaster Tools verification" },
                  ], "Bing Webmaster")}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" /> Simpan Bing
                </Button>
              </CardContent>
            </Card>

            {/* Yandex Webmaster */}
            <Card>
              <CardHeader>
                <SectionHeader
                  icon={Search}
                  title="Yandex Webmaster"
                  description="Verifikasi situs di mesin pencari Yandex."
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <SettingField
                  label="Verification Meta Tag (content value)"
                  settingKey="yandex_verification"
                  placeholder="contoh: abcdef1234567890"
                  description='Nilai content dari <meta name="yandex-verification" content="...">. Dapatkan dari Yandex Webmaster → Verifikasi.'
                  docsUrl="https://webmaster.yandex.com"
                  value={settings["yandex_verification"] ?? ""}
                  onChange={set}
                />
                <Button
                  onClick={() => saveSection([
                    { key: "yandex_verification", description: "Yandex Webmaster verification" },
                  ], "Yandex Webmaster")}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" /> Simpan Yandex
                </Button>
              </CardContent>
            </Card>

            {/* Indexing APIs */}
            <Card>
              <CardHeader>
                <SectionHeader
                  icon={Search}
                  title="Indexing API"
                  description="API untuk memaksa Google mengindeks halaman baru lebih cepat (Indexing API)."
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
                  <div className="flex gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>Google Indexing API</strong> memerlukan Service Account JSON. Upload file JSON
                      credential dari Google Cloud Console (aktifkan Indexing API terlebih dahulu).
                    </div>
                  </div>
                </div>
                <SettingField
                  label="Google Indexing API — Service Account Email"
                  settingKey="google_indexing_service_account"
                  placeholder="serviceaccount@project-id.iam.gserviceaccount.com"
                  description="Email dari Google Service Account yang memiliki akses Indexing API."
                  docsUrl="https://developers.google.com/search/apis/indexing-api/v3/quickstart"
                  value={settings["google_indexing_service_account"] ?? ""}
                  onChange={set}
                />
                <SettingField
                  label="Google Indexing API — Private Key (JSON)"
                  settingKey="google_indexing_private_key"
                  placeholder='{"type":"service_account","project_id":"..."}'
                  type="textarea"
                  description="Paste isi file JSON credential di sini. Disimpan terenkripsi."
                  value={settings["google_indexing_private_key"] ?? ""}
                  onChange={set}
                />
                <Button
                  onClick={() => saveSection([
                    { key: "google_indexing_service_account", description: "Google Indexing API service account email" },
                    { key: "google_indexing_private_key", description: "Google Indexing API private key JSON" },
                  ], "Indexing API")}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" /> Simpan Indexing API
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SOCIAL MEDIA ── */}
          <TabsContent value="social" className="space-y-6 mt-6">
            {/* Twitter / X */}
            <Card>
              <CardHeader>
                <SectionHeader
                  icon={Share2}
                  title="Twitter / X Cards"
                  description="Konfigurasi tampilan link preview saat dibagikan di Twitter/X."
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <SettingField
                  label="Twitter Card Type"
                  settingKey="twitter_card_type"
                  type="select"
                  options={[
                    { value: "summary", label: "summary — Thumbnail kecil" },
                    { value: "summary_large_image", label: "summary_large_image — Gambar besar (direkomendasikan)" },
                    { value: "app", label: "app — Untuk aplikasi" },
                  ]}
                  placeholder="Pilih tipe card"
                  description="Tipe tampilan card saat link dibagikan di Twitter/X."
                  docsUrl="https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards"
                  value={settings["twitter_card_type"] ?? "summary_large_image"}
                  onChange={set}
                />
                <SettingField
                  label="Twitter/X Username (tanpa @)"
                  settingKey="twitter_site_username"
                  placeholder="shopee_recommend"
                  description="Akun Twitter/X resmi platform ini. Muncul di card preview."
                  value={settings["twitter_site_username"] ?? ""}
                  onChange={set}
                />
                <SettingField
                  label="Twitter/X Creator Username"
                  settingKey="twitter_creator_username"
                  placeholder="shopee_recommend"
                  description="Username pembuat konten (biasanya sama dengan Site Username)."
                  value={settings["twitter_creator_username"] ?? ""}
                  onChange={set}
                />
                <Button
                  onClick={() => saveSection([
                    { key: "twitter_card_type", description: "Twitter Card type" },
                    { key: "twitter_site_username", description: "Twitter site username" },
                    { key: "twitter_creator_username", description: "Twitter creator username" },
                  ], "Twitter/X Cards")}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" /> Simpan Twitter/X
                </Button>
              </CardContent>
            </Card>

            {/* Facebook / Open Graph */}
            <Card>
              <CardHeader>
                <SectionHeader
                  icon={Share2}
                  title="Facebook & Open Graph"
                  description="Konfigurasi tampilan link saat dibagikan di Facebook, WhatsApp, Telegram, dll."
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <SettingField
                  label="Facebook App ID"
                  settingKey="facebook_app_id"
                  placeholder="123456789012345"
                  description="App ID dari Facebook Developer Console. Aktifkan fitur Open Graph Debugger."
                  docsUrl="https://developers.facebook.com/apps"
                  value={settings["facebook_app_id"] ?? ""}
                  onChange={set}
                />
                <SettingField
                  label="OG Site Name"
                  settingKey="og_site_name"
                  placeholder="ShopeeRecommend"
                  description="Nama situs untuk tag og:site_name. Ditampilkan di preview link."
                  value={settings["og_site_name"] ?? ""}
                  onChange={set}
                />
                <SettingField
                  label="OG Default Image URL"
                  settingKey="og_default_image"
                  placeholder="https://yourdomain.com/og-image.jpg"
                  description="Gambar default (1200×630px) untuk halaman tanpa gambar spesifik. Digunakan oleh Facebook, WhatsApp, Telegram."
                  value={settings["og_default_image"] ?? ""}
                  onChange={set}
                />
                <SettingField
                  label="OG Locale"
                  settingKey="og_locale"
                  type="select"
                  options={[
                    { value: "id_ID", label: "id_ID — Bahasa Indonesia" },
                    { value: "en_US", label: "en_US — English (US)" },
                    { value: "en_GB", label: "en_GB — English (UK)" },
                  ]}
                  placeholder="Pilih locale"
                  description="Bahasa/locale untuk Open Graph. Pengaruhi tampilan di Facebook."
                  value={settings["og_locale"] ?? "id_ID"}
                  onChange={set}
                />
                <Button
                  onClick={() => saveSection([
                    { key: "facebook_app_id", description: "Facebook App ID" },
                    { key: "og_site_name", description: "OG site name" },
                    { key: "og_default_image", description: "OG default image URL" },
                    { key: "og_locale", description: "OG locale" },
                  ], "Open Graph")}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" /> Simpan Open Graph
                </Button>
              </CardContent>
            </Card>

            {/* Pinterest */}
            <Card>
              <CardHeader>
                <SectionHeader
                  icon={Share2}
                  title="Pinterest"
                  description="Verifikasi situs dan aktifkan Rich Pins di Pinterest."
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <SettingField
                  label="Pinterest Verification Code"
                  settingKey="pinterest_verification"
                  placeholder="contoh: abcdef1234"
                  description='Nilai content dari <meta name="p:domain_verify" content="...">. Dapatkan dari Pinterest Business → Klaim Situs Web.'
                  docsUrl="https://help.pinterest.com/en/business/article/claim-your-website"
                  value={settings["pinterest_verification"] ?? ""}
                  onChange={set}
                />
                <Button
                  onClick={() => saveSection([
                    { key: "pinterest_verification", description: "Pinterest site verification" },
                  ], "Pinterest")}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" /> Simpan Pinterest
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ANALYTICS ── */}
          <TabsContent value="analytics" className="space-y-6 mt-6">
            {/* Google Analytics */}
            <Card>
              <CardHeader>
                <SectionHeader
                  icon={BarChart3}
                  title="Google Analytics 4 (GA4)"
                  description="Lacak traffic, konversi, dan perilaku pengguna di situs Anda."
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <SettingField
                  label="GA4 Measurement ID"
                  settingKey="ga4_measurement_id"
                  placeholder="G-XXXXXXXXXX"
                  description="Format: G-XXXXXXXXXX. Dapatkan dari Google Analytics → Admin → Data Streams → Web."
                  docsUrl="https://analytics.google.com"
                  value={settings["ga4_measurement_id"] ?? ""}
                  onChange={set}
                />
                <SettingField
                  label="GA4 API Secret (Measurement Protocol)"
                  settingKey="ga4_api_secret"
                  placeholder="xxxxxxxxxxxxxxxxxxxxxx"
                  description="Opsional. Untuk pengiriman event server-side. Buat di Admin → Data Streams → Measurement Protocol API secrets."
                  value={settings["ga4_api_secret"] ?? ""}
                  onChange={set}
                />
                <Button
                  onClick={() => saveSection([
                    { key: "ga4_measurement_id", description: "Google Analytics 4 Measurement ID" },
                    { key: "ga4_api_secret", description: "GA4 Measurement Protocol API Secret" },
                  ], "Google Analytics 4")}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" /> Simpan GA4
                </Button>
              </CardContent>
            </Card>

            {/* Google Ads */}
            <Card>
              <CardHeader>
                <SectionHeader
                  icon={BarChart3}
                  title="Google Ads (Conversion Tracking)"
                  description="Lacak konversi dari kampanye Google Ads."
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <SettingField
                  label="Google Ads Conversion Tag ID"
                  settingKey="google_ads_tag_id"
                  placeholder="AW-XXXXXXXXX"
                  description="Format: AW-XXXXXXXXX. Dapatkan dari Google Ads → Tools → Conversion Tracking."
                  docsUrl="https://ads.google.com"
                  value={settings["google_ads_tag_id"] ?? ""}
                  onChange={set}
                />
                <SettingField
                  label="Google Ads Conversion Label"
                  settingKey="google_ads_conversion_label"
                  placeholder="xxxxxxxxxxxxxxxxxxxxxx"
                  description="Label konversi spesifik dari Google Ads."
                  value={settings["google_ads_conversion_label"] ?? ""}
                  onChange={set}
                />
                <Button
                  onClick={() => saveSection([
                    { key: "google_ads_tag_id", description: "Google Ads conversion tag ID" },
                    { key: "google_ads_conversion_label", description: "Google Ads conversion label" },
                  ], "Google Ads")}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" /> Simpan Google Ads
                </Button>
              </CardContent>
            </Card>

            {/* Meta Pixel */}
            <Card>
              <CardHeader>
                <SectionHeader
                  icon={BarChart3}
                  title="Meta Pixel (Facebook Pixel)"
                  description="Lacak konversi dan buat retargeting audience dari Facebook/Instagram Ads."
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <SettingField
                  label="Meta Pixel ID"
                  settingKey="meta_pixel_id"
                  placeholder="1234567890123456"
                  description="Dapatkan dari Meta Business Suite → Events Manager → Connect Data Sources → Web → Meta Pixel."
                  docsUrl="https://business.facebook.com/events_manager"
                  value={settings["meta_pixel_id"] ?? ""}
                  onChange={set}
                />
                <Button
                  onClick={() => saveSection([
                    { key: "meta_pixel_id", description: "Meta Pixel ID" },
                  ], "Meta Pixel")}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" /> Simpan Meta Pixel
                </Button>
              </CardContent>
            </Card>

            {/* TikTok Pixel */}
            <Card>
              <CardHeader>
                <SectionHeader
                  icon={BarChart3}
                  title="TikTok Pixel"
                  description="Lacak konversi dari kampanye TikTok Ads."
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <SettingField
                  label="TikTok Pixel ID"
                  settingKey="tiktok_pixel_id"
                  placeholder="XXXXXXXXXXXXX"
                  description="Dapatkan dari TikTok Ads Manager → Assets → Events → Manage → Web Events."
                  docsUrl="https://ads.tiktok.com"
                  value={settings["tiktok_pixel_id"] ?? ""}
                  onChange={set}
                />
                <Button
                  onClick={() => saveSection([
                    { key: "tiktok_pixel_id", description: "TikTok Pixel ID" },
                  ], "TikTok Pixel")}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" /> Simpan TikTok Pixel
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── GENERAL SEO ── */}
          <TabsContent value="general-seo" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <SectionHeader
                  icon={Globe}
                  title="Pengaturan SEO Umum"
                  description="Konfigurasi dasar yang mempengaruhi semua halaman."
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <SettingField
                  label="Canonical Base URL"
                  settingKey="canonical_base_url"
                  placeholder="https://yourdomain.com"
                  description="URL dasar situs (tanpa trailing slash). Digunakan untuk tag canonical dan sitemap."
                  value={settings["canonical_base_url"] ?? ""}
                  onChange={set}
                />
                <SettingField
                  label="Template Meta Title"
                  settingKey="meta_title_template"
                  placeholder="%s | ShopeeRecommend"
                  description='Template judul halaman. Gunakan %s untuk judul spesifik. Contoh: "%s | ShopeeRecommend" → "Review Nike | ShopeeRecommend".'
                  value={settings["meta_title_template"] ?? "%s | ShopeeRecommend"}
                  onChange={set}
                />
                <SettingField
                  label="Default Meta Description"
                  settingKey="default_meta_desc"
                  placeholder="Platform rekomendasi produk Shopee terpercaya..."
                  type="textarea"
                  description="Deskripsi default (150-160 karakter) untuk halaman yang tidak memiliki meta description spesifik."
                  value={settings["default_meta_desc"] ?? ""}
                  onChange={set}
                />
                <SettingField
                  label="Default Meta Keywords"
                  settingKey="default_meta_keywords"
                  placeholder="shopee, review produk, rekomendasi, afiliasi"
                  description="Kata kunci default dipisah koma. Meski tidak terlalu berpengaruh, tetap baik untuk konsistensi."
                  value={settings["default_meta_keywords"] ?? ""}
                  onChange={set}
                />
                <SettingField
                  label="Robots.txt Directives"
                  settingKey="robots_txt"
                  placeholder={"User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /generate"}
                  type="textarea"
                  description="Konten file robots.txt. Gunakan untuk mengontrol halaman mana yang diindeks mesin pencari."
                  value={settings["robots_txt"] ?? "User-agent: *\nAllow: /\nDisallow: /admin/"}
                  onChange={set}
                />
                <Button
                  onClick={() => saveSection([
                    { key: "canonical_base_url", description: "Canonical base URL" },
                    { key: "meta_title_template", description: "Meta title template" },
                    { key: "default_meta_desc", description: "Default meta description" },
                    { key: "default_meta_keywords", description: "Default meta keywords" },
                    { key: "robots_txt", description: "Robots.txt directives" },
                  ], "SEO Umum")}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" /> Simpan SEO Umum
                </Button>
              </CardContent>
            </Card>

            {/* Sitemap settings */}
            <Card>
              <CardHeader>
                <SectionHeader
                  icon={Globe}
                  title="Sitemap XML"
                  description="Konfigurasi sitemap untuk pengiriman ke mesin pencari."
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <SettingField
                  label="Sitemap Change Frequency"
                  settingKey="sitemap_changefreq"
                  type="select"
                  options={[
                    { value: "always", label: "always" },
                    { value: "hourly", label: "hourly" },
                    { value: "daily", label: "daily (direkomendasikan)" },
                    { value: "weekly", label: "weekly" },
                    { value: "monthly", label: "monthly" },
                    { value: "yearly", label: "yearly" },
                  ]}
                  placeholder="Pilih frekuensi"
                  description="Seberapa sering konten situs Anda berubah (digunakan di sitemap XML)."
                  value={settings["sitemap_changefreq"] ?? "daily"}
                  onChange={set}
                />
                <SettingField
                  label="Sitemap Priority — Halaman Produk"
                  settingKey="sitemap_priority_product"
                  type="select"
                  options={[
                    { value: "1.0", label: "1.0 — Tertinggi" },
                    { value: "0.9", label: "0.9" },
                    { value: "0.8", label: "0.8 (direkomendasikan untuk produk)" },
                    { value: "0.7", label: "0.7" },
                    { value: "0.5", label: "0.5 — Normal" },
                  ]}
                  description="Prioritas halaman produk di sitemap XML."
                  value={settings["sitemap_priority_product"] ?? "0.8"}
                  onChange={set}
                />
                <Button
                  onClick={() => saveSection([
                    { key: "sitemap_changefreq", description: "Sitemap change frequency" },
                    { key: "sitemap_priority_product", description: "Sitemap priority for product pages" },
                  ], "Sitemap")}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" /> Simpan Sitemap
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── SCHEMA.ORG ── */}
          <TabsContent value="schema" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <SectionHeader
                  icon={Code2}
                  title="Schema.org / JSON-LD"
                  description="Data terstruktur untuk Rich Snippets di Google Search. Tampilkan bintang rating, harga, dan informasi produk langsung di hasil pencarian."
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                  <div className="flex gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      Data Schema.org berpengaruh besar pada tampilan halaman produk di Google.
                      Isi dengan akurat untuk mendapatkan <strong>Rich Snippets</strong> (bintang, harga, dll).
                    </div>
                  </div>
                </div>

                <SettingField
                  label="Organization Name"
                  settingKey="schema_org_name"
                  placeholder="ShopeeRecommend"
                  description="Nama organisasi/perusahaan untuk schema Organization."
                  value={settings["schema_org_name"] ?? ""}
                  onChange={set}
                />
                <SettingField
                  label="Organization Logo URL"
                  settingKey="schema_org_logo"
                  placeholder="https://yourdomain.com/logo.png"
                  description="URL logo organisasi (minimal 112×112px, format PNG/JPG). Digunakan di Knowledge Panel Google."
                  value={settings["schema_org_logo"] ?? ""}
                  onChange={set}
                />
                <SettingField
                  label="Organization URL"
                  settingKey="schema_org_url"
                  placeholder="https://yourdomain.com"
                  description="URL utama situs untuk schema Organization."
                  value={settings["schema_org_url"] ?? ""}
                  onChange={set}
                />
                <SettingField
                  label="Contact Email"
                  settingKey="schema_contact_email"
                  placeholder="contact@yourdomain.com"
                  description="Email kontak untuk schema ContactPoint."
                  value={settings["schema_contact_email"] ?? ""}
                  onChange={set}
                />
                <SettingField
                  label="Tipe Bisnis (Organization Type)"
                  settingKey="schema_org_type"
                  type="select"
                  options={[
                    { value: "Organization", label: "Organization — Umum" },
                    { value: "LocalBusiness", label: "LocalBusiness — Bisnis lokal" },
                    { value: "Corporation", label: "Corporation — Perusahaan" },
                    { value: "NewsMediaOrganization", label: "NewsMediaOrganization — Media" },
                    { value: "OnlineBusiness", label: "OnlineBusiness — Bisnis Online" },
                    { value: "Store", label: "Store — Toko" },
                  ]}
                  description="Tipe organisasi untuk schema.org. Pilih yang paling sesuai dengan bisnis Anda."
                  value={settings["schema_org_type"] ?? "Organization"}
                  onChange={set}
                />
                <SettingField
                  label="Website Description (Schema)"
                  settingKey="schema_site_desc"
                  placeholder="Platform rekomendasi produk Shopee terpercaya di Indonesia."
                  type="textarea"
                  description="Deskripsi singkat situs untuk schema.org WebSite."
                  value={settings["schema_site_desc"] ?? ""}
                  onChange={set}
                />
                <Button
                  onClick={() => saveSection([
                    { key: "schema_org_name", description: "Schema.org organization name" },
                    { key: "schema_org_logo", description: "Schema.org organization logo URL" },
                    { key: "schema_org_url", description: "Schema.org organization URL" },
                    { key: "schema_contact_email", description: "Schema.org contact email" },
                    { key: "schema_org_type", description: "Schema.org organization type" },
                    { key: "schema_site_desc", description: "Schema.org website description" },
                  ], "Schema.org")}
                  disabled={isSaving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" /> Simpan Schema.org
                </Button>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Code2 className="h-4 w-4" />
                  Preview JSON-LD Output
                </CardTitle>
                <CardDescription>
                  Kode JSON-LD yang akan disuntikkan ke setiap halaman berdasarkan pengaturan di atas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto">
{JSON.stringify({
  "@context": "https://schema.org",
  "@type": settings["schema_org_type"] || "Organization",
  "name": settings["schema_org_name"] || "ShopeeRecommend",
  "url": settings["schema_org_url"] || "https://yourdomain.com",
  "logo": settings["schema_org_logo"] || "https://yourdomain.com/logo.png",
  "description": settings["schema_site_desc"] || "",
  "contactPoint": settings["schema_contact_email"] ? {
    "@type": "ContactPoint",
    "email": settings["schema_contact_email"],
    "contactType": "customer support"
  } : undefined,
}, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Status Konfigurasi SEO
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[
                { key: "google_sc_verification", label: "Google SC" },
                { key: "bing_verification", label: "Bing" },
                { key: "yandex_verification", label: "Yandex" },
                { key: "ga4_measurement_id", label: "GA4" },
                { key: "meta_pixel_id", label: "Meta Pixel" },
                { key: "twitter_card_type", label: "Twitter Card" },
                { key: "facebook_app_id", label: "Facebook" },
                { key: "canonical_base_url", label: "Canonical URL" },
                { key: "schema_org_name", label: "Schema.org" },
                { key: "og_default_image", label: "OG Image" },
                { key: "google_ads_tag_id", label: "Google Ads" },
                { key: "tiktok_pixel_id", label: "TikTok Pixel" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                  <span className="text-xs font-medium">{label}</span>
                  {settings[key] ? (
                    <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-600">✓ Aktif</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Belum diisi</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
