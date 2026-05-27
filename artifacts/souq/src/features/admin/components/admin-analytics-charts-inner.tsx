import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BTN_FIX, CARD_SHELL } from "@/features/admin/admin-interaction-classes";
import { getLocale, t } from "@/i18n";
import { cn } from "@/lib/utils";
import type { AdminAnalyticsChartData } from "./admin-analytics-charts";

const ADS_STATUS_COLORS: Record<string, string> = {
  pending: "#eab308",
  approved: "hsl(var(--primary))",
  rejected: "#ef4444",
  hidden: "#71717a",
};

const tooltipStyle = {
  backgroundColor: "rgba(9,9,11,0.95)",
  border: "1px solid hsl(var(--primary) / 0.35)",
  borderRadius: 12,
  color: "#fafafa",
};

export default function AdminAnalyticsChartsInner({ data }: { data: AdminAnalyticsChartData }) {
  const numberLocale = getLocale() === "ar" ? "ar-EG" : getLocale() === "de" ? "de-DE" : "en-US";

  return (
    <>
      <div className={cn(CARD_SHELL, "p-4")}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">{data.adsByStatusTitle}</h2>
          <button
            type="button"
            onClick={data.onManageAds}
            className={cn(
              BTN_FIX,
              "cursor-pointer rounded text-xs font-medium text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:opacity-80",
            )}
          >
            {data.manageLabel}
          </button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">{t("p8.admin.charts.ads_by_status_hint")}</p>
        <div className="h-64" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.adsStatusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={88}
                paddingAngle={2}
              >
                {data.adsStatusData.map((entry) => (
                  <Cell key={entry.key} fill={ADS_STATUS_COLORS[entry.key] || "#71717a"} />
                ))}
              </Pie>
              <Legend
                verticalAlign="bottom"
                formatter={(value) => <span style={{ color: "#e4e4e7", fontSize: 12 }}>{value}</span>}
              />
              <Tooltip
                formatter={(value: number, _name, item) => [
                  `${Number(value).toLocaleString(numberLocale)} ${data.adUnit}`,
                  String(item?.payload?.name ?? ""),
                ]}
                contentStyle={tooltipStyle}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={cn(CARD_SHELL, "p-4")}>
        <h2 className="mb-1 text-lg font-semibold text-foreground">{data.periodMetricsTitle}</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          {t("p8.admin.charts.period_metrics_hint", { period: data.periodLabel })}
        </p>
        <div className="h-64" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.periodBarData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--primary) / 0.12)" />
              <XAxis dataKey="name" stroke="#a1a1aa" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <YAxis stroke="#a1a1aa" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
              <Tooltip
                formatter={(value: number) => `${Number(value).toLocaleString(numberLocale)}`}
                contentStyle={tooltipStyle}
                cursor={{ fill: "hsl(var(--primary) / 0.12)" }}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} maxBarSize={56} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
