import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIdr } from "@/lib/format";

const API_BASE = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

type Point = { recordedAt: string | null; price: number };

type Stats = {
  min: number;
  max: number;
  firstPrice: number;
  lastPrice: number;
  changePct: number;
  windowDays: number;
  dataPoints: number;
};

type Response = {
  currentPrice: number;
  history: Point[];
  stats: Stats;
};

interface Props {
  slug: string;
}

export function PriceHistoryChart({ slug }: Props) {
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/products/${encodeURIComponent(slug)}/price-history`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data || data.history.length < 2) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        Belum ada cukup data riwayat harga untuk ditampilkan. Cek lagi nanti.
      </p>
    );
  }

  const { stats } = data;
  const trendIcon =
    stats.changePct < 0 ? TrendingDown : stats.changePct > 0 ? TrendingUp : Minus;
  const TrendIcon = trendIcon;
  const trendColor =
    stats.changePct < 0
      ? "text-emerald-600"
      : stats.changePct > 0
        ? "text-rose-600"
        : "text-muted-foreground";

  const chartData = data.history.map((h) => ({
    date: h.recordedAt
      ? new Date(h.recordedAt).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        })
      : "",
    price: h.price,
  }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Terendah</div>
          <div className="font-bold text-emerald-600">{formatIdr(stats.min)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Tertinggi</div>
          <div className="font-bold">{formatIdr(stats.max)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">
            Tren {stats.windowDays} hari
          </div>
          <div className={`font-bold flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="h-3.5 w-3.5" />
            {stats.changePct > 0 ? "+" : ""}
            {stats.changePct}%
          </div>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={20}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) =>
                v >= 1_000_000
                  ? `${(v / 1_000_000).toFixed(1)}jt`
                  : v >= 1000
                    ? `${Math.round(v / 1000)}rb`
                    : String(v)
              }
              width={50}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(v: number) => [formatIdr(v), "Harga"]}
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#priceFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-muted-foreground">
        Riwayat harga {stats.dataPoints} titik · jendela {stats.windowDays} hari ·
        terakhir update otomatis tiap perubahan harga.
      </p>
    </div>
  );
}
