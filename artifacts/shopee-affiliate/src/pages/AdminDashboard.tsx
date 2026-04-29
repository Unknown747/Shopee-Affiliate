import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import {
  useGetDashboardStats,
  useGetTopProducts,
  useGetClicksChart,
  useUpsertSetting,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Package, TrendingUp, MousePointerClick, Eye, DollarSign, ShoppingBag, Plus, Sparkles, Save } from "lucide-react";
import { formatIdr, formatNumber } from "@/lib/format";
import { useSiteConfig, resolveBrand } from "@/lib/site-config";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

function QuickBrandRename() {
  const { data: cfg, refetch } = useSiteConfig();
  const currentBrand = resolveBrand(cfg).name;
  const [value, setValue] = useState(currentBrand);
  const upsertMutation = useUpsertSetting();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    setValue(currentBrand);
  }, [currentBrand]);

  const trimmed = value.trim();
  const dirty = trimmed.length > 0 && trimmed !== currentBrand;

  const save = async () => {
    if (!dirty) return;
    try {
      await upsertMutation.mutateAsync({
        data: {
          key: "brand_name",
          value: trimmed,
          description: "Nama brand situs (tampil di header, footer, dan judul halaman)",
        },
      });
      await refetch();
      queryClient.invalidateQueries();
      toast({
        title: "Nama brand diperbarui!",
        description: `Nama situs sekarang "${trimmed}". Perubahan langsung berlaku di seluruh halaman.`,
      });
    } catch {
      toast({ title: "Gagal menyimpan nama brand", variant: "destructive" });
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Ganti Nama Brand 1-Klik
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="quick-brand" className="text-xs text-muted-foreground">
            Nama brand sekarang: <span className="font-semibold text-foreground">{currentBrand}</span>
          </Label>
          <div className="flex gap-2">
            <Input
              id="quick-brand"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Mis. KulineRecommend"
              maxLength={60}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
              }}
            />
            <Button
              type="button"
              onClick={save}
              disabled={!dirty || upsertMutation.isPending}
              className="shrink-0"
            >
              <Save className="h-4 w-4 mr-2" />
              {upsertMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Akan langsung mengubah nama di header, footer, judul tab browser, dan seluruh halaman situs.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading: loadingStats } = useGetDashboardStats();
  const { data: topProducts, isLoading: loadingTop } = useGetTopProducts({ limit: 10 });
  const { data: chartData, isLoading: loadingChart } = useGetClicksChart({ days: 30 });

  const statCards = [
    { title: "Total Produk", value: stats?.totalProducts ?? 0, icon: Package, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { title: "Dipublish", value: stats?.publishedProducts ?? 0, icon: ShoppingBag, color: "text-green-500", bg: "bg-green-50 dark:bg-green-950/30" },
    { title: "Total Klik", value: stats?.totalClicks ?? 0, icon: MousePointerClick, color: "text-primary", bg: "bg-primary/5", format: formatNumber },
    { title: "Total Tampilan", value: stats?.totalViews ?? 0, icon: Eye, color: "text-purple-500", bg: "bg-purple-50 dark:bg-purple-950/30", format: formatNumber },
    { title: "Est. Komisi", value: stats?.estimatedCommission ?? 0, icon: DollarSign, color: "text-yellow-500", bg: "bg-yellow-50 dark:bg-yellow-950/30", format: formatIdr },
    { title: "Draft", value: stats?.draftProducts ?? 0, icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30" },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Selamat datang di panel admin</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button asChild variant="outline">
              <Link href="/admin/seo">Audit SEO</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/generate">
                <Plus className="h-4 w-4 mr-2" />
                Generate Konten
              </Link>
            </Button>
          </div>
        </div>

        <QuickBrandRename />

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map((card, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="pt-4 pb-4">
                <div className={`inline-flex p-2 rounded-lg ${card.bg} mb-3`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                {loadingStats ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <div className="text-2xl font-bold">
                    {card.format ? card.format(card.value) : card.value.toLocaleString("id-ID")}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">{card.title}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Klik & Tampilan (30 Hari)</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingChart ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => {
                        const d = new Date(v);
                        return `${d.getDate()}/${d.getMonth() + 1}`;
                      }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value, name) => [value, name === "clicks" ? "Klik" : "Tampilan"]}
                      labelFormatter={(v) => new Date(v).toLocaleDateString("id-ID")}
                    />
                    <Area type="monotone" dataKey="views" name="views" stroke="#a855f7" fill="#a855f7" fillOpacity={0.1} strokeWidth={2} />
                    <Area type="monotone" dataKey="clicks" name="clicks" stroke="#ee4d2d" fill="#ee4d2d" fillOpacity={0.2} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kategori Teratas</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {stats?.topCategories.slice(0, 5).map((cat, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                        <span className="text-sm font-medium truncate max-w-[140px]">{cat.category}</span>
                      </div>
                      <Badge variant="secondary">{cat.count}</Badge>
                    </div>
                  ))}
                  {(!stats?.topCategories.length) && (
                    <p className="text-sm text-muted-foreground text-center py-4">Belum ada data</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Products */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Top 10 Produk (Klik Terbanyak)</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/products">Kelola Semua</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loadingTop ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : !topProducts?.length ? (
              <p className="text-center text-muted-foreground py-8">Belum ada data produk</p>
            ) : (
              <div className="space-y-1">
                {topProducts.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <span className="text-sm font-bold text-muted-foreground w-5 text-center">{i + 1}</span>
                    <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{formatIdr(p.price)}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3" /> {formatNumber(p.clickCount)}</span>
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {formatNumber(p.viewCount)}</span>
                      <Badge variant={p.status === "published" ? "default" : "secondary"} className="hidden sm:flex">{p.status}</Badge>
                    </div>
                    <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
                      <Link href={`/product/${p.slug}`}>Lihat</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Products */}
        {stats?.recentProducts.length ? (
          <Card>
            <CardHeader><CardTitle className="text-base">Produk Terbaru</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {stats.recentProducts.map((p) => (
                  <div key={p.id} className="flex flex-col gap-2">
                    <img src={p.imageUrl} alt={p.name} className="aspect-square rounded-lg object-cover" />
                    <p className="text-xs font-medium line-clamp-2">{p.name}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-primary font-semibold">{formatIdr(p.price)}</span>
                      <Badge variant={p.status === "published" ? "default" : "secondary"} className="text-xs">{p.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </Layout>
  );
}
