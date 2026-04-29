import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getAdminToken } from "@/hooks/use-admin";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  ExternalLink,
  Edit,
  TrendingUp,
} from "lucide-react";

const API_BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

type Severity = "high" | "medium" | "low" | "none";

interface AuditedProduct {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  category: string | null;
  status: string;
  issues: string[];
  score: number;
  worstSeverity: Severity;
}

interface AuditResponse {
  summary: {
    total: number;
    perfect: number;
    high: number;
    medium: number;
    low: number;
    avgScore: number;
    issueCounts: Record<string, number>;
  };
  labels: Record<string, string>;
  severities: Record<string, "high" | "medium" | "low">;
  products: AuditedProduct[];
}

const severityColor: Record<Severity, string> = {
  high: "bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400",
  medium:
    "bg-yellow-500/10 text-yellow-700 border-yellow-500/30 dark:text-yellow-400",
  low: "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400",
  none: "bg-green-500/10 text-green-600 border-green-500/30 dark:text-green-400",
};

const severityLabel: Record<Severity, string> = {
  high: "Kritis",
  medium: "Sedang",
  low: "Ringan",
  none: "Sempurna",
};

function scoreColor(score: number): string {
  if (score >= 90) return "text-green-600 dark:text-green-400";
  if (score >= 70) return "text-blue-600 dark:text-blue-400";
  if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

export default function AdminSeoAudit() {
  const { toast } = useToast();
  const token = getAdminToken();
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");
  const [issueFilter, setIssueFilter] = useState<string>("all");

  async function fetchAudit() {
    try {
      const res = await fetch(`${API_BASE}/api/admin/seo-audit`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as AuditResponse;
      setData(json);
    } catch (err) {
      toast({
        title: "Gagal memuat audit SEO",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchAudit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.products;
    if (severityFilter !== "all") {
      list = list.filter((p) => p.worstSeverity === severityFilter);
    }
    if (issueFilter !== "all") {
      list = list.filter((p) => p.issues.includes(issueFilter));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [data, severityFilter, issueFilter, search]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAudit();
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Audit SEO</h1>
            <p className="text-muted-foreground">
              Daftar produk dengan kelengkapan SEO yang masih bisa ditingkatkan
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="inline-flex p-2 rounded-lg bg-primary/10 mb-3">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              {loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className={`text-2xl font-bold ${scoreColor(data?.summary.avgScore ?? 0)}`}>
                  {data?.summary.avgScore ?? 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Skor SEO rata-rata
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="inline-flex p-2 rounded-lg bg-green-500/10 mb-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              {loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-bold text-green-600">
                  {data?.summary.perfect ?? 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Produk sempurna
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="inline-flex p-2 rounded-lg bg-red-500/10 mb-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              {loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-bold text-red-600">
                  {data?.summary.high ?? 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Issue kritis
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="inline-flex p-2 rounded-lg bg-yellow-500/10 mb-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              {loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-bold text-yellow-600">
                  {data?.summary.medium ?? 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Issue sedang</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="inline-flex p-2 rounded-lg bg-blue-500/10 mb-3">
                <AlertTriangle className="h-5 w-5 text-blue-600" />
              </div>
              {loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-bold text-blue-600">
                  {data?.summary.low ?? 0}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Issue ringan</p>
            </CardContent>
          </Card>
        </div>

        {/* Issue breakdown */}
        {data && data.products.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Breakdown issue per kategori
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(data.summary.issueCounts)
                  .filter(([, count]) => count > 0)
                  .sort(([a], [b]) => {
                    const order: Record<string, number> = {
                      high: 0,
                      medium: 1,
                      low: 2,
                    };
                    return (
                      (order[data.severities[a] ?? "low"] ?? 99) -
                      (order[data.severities[b] ?? "low"] ?? 99)
                    );
                  })
                  .map(([key, count]) => {
                    const sev = (data.severities[key] ?? "low") as Severity;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setIssueFilter(key)}
                        className={`text-left p-3 rounded-lg border transition hover:scale-[1.02] ${severityColor[sev]}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold uppercase tracking-wide">
                            {severityLabel[sev]}
                          </span>
                          <span className="text-2xl font-bold">{count}</span>
                        </div>
                        <p className="text-sm">{data.labels[key] ?? key}</p>
                      </button>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama / slug / kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={severityFilter}
            onValueChange={(v: typeof severityFilter) => setSeverityFilter(v)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua severity</SelectItem>
              <SelectItem value="high">Kritis (high)</SelectItem>
              <SelectItem value="medium">Sedang (medium)</SelectItem>
              <SelectItem value="low">Ringan (low)</SelectItem>
              <SelectItem value="none">Sempurna</SelectItem>
            </SelectContent>
          </Select>
          {issueFilter !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIssueFilter("all")}
            >
              Hapus filter issue: {data?.labels[issueFilter] ?? issueFilter}
            </Button>
          )}
        </div>

        {/* Product list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {loading
                ? "Memuat..."
                : `${filtered.length} produk${
                    filtered.length !== data?.products.length
                      ? ` (dari ${data?.products.length ?? 0})`
                      : ""
                  }`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500/50" />
                <p>Tidak ada produk yang cocok dengan filter ini.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((p) => (
                  <div
                    key={p.id}
                    className="py-4 flex items-start gap-4 flex-wrap"
                  >
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        width={64}
                        height={64}
                        loading="lazy"
                        className="w-16 h-16 rounded-lg object-cover bg-muted flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
                        <AlertCircle className="h-6 w-6" />
                      </div>
                    )}

                    <div className="flex-1 min-w-[240px]">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold line-clamp-1">{p.name}</h3>
                        <Badge
                          variant="outline"
                          className={severityColor[p.worstSeverity]}
                        >
                          {severityLabel[p.worstSeverity]}
                        </Badge>
                        <span
                          className={`text-sm font-bold ${scoreColor(p.score)}`}
                        >
                          {p.score}/100
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        /product/{p.slug}
                        {p.category ? ` · ${p.category}` : ""}
                      </p>
                      {p.issues.length === 0 ? (
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> SEO lengkap
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {p.issues.map((iss) => {
                            const sev = (data!.severities[iss] ??
                              "low") as Severity;
                            return (
                              <button
                                key={iss}
                                type="button"
                                onClick={() => setIssueFilter(iss)}
                                className={`text-xs px-2 py-0.5 rounded border ${severityColor[sev]}`}
                              >
                                {data!.labels[iss] ?? iss}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/product/${p.slug}`}>
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          Lihat
                        </Link>
                      </Button>
                      <Button asChild size="sm">
                        <Link href={`/admin/products?edit=${p.id}`}>
                          <Edit className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
