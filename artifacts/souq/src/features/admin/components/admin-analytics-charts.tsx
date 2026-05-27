import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const AdminAnalyticsChartsInner = lazy(() => import("./admin-analytics-charts-inner"));

export type AdminAnalyticsChartData = {
  adsStatusData: Array<{ name: string; key: string; value: number }>;
  periodBarData: Array<{ name: string; value: number }>;
  periodLabel: string;
  adsByStatusTitle: string;
  periodMetricsTitle: string;
  manageLabel: string;
  adUnit: string;
  onManageAds: () => void;
};

type AdminAnalyticsChartsProps = {
  data: AdminAnalyticsChartData;
};

function ChartsFallback() {
  return (
    <div className="flex h-64 items-center justify-center rounded-2xl border border-primary/25 bg-zinc-950/60">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
    </div>
  );
}

/** Lazy-loads Recharts (~95KB gzip) only when analytics charts mount (P8M-2). */
export function AdminAnalyticsCharts({ data }: AdminAnalyticsChartsProps) {
  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Suspense fallback={<ChartsFallback />}>
        <AdminAnalyticsChartsInner data={data} />
      </Suspense>
    </section>
  );
}
