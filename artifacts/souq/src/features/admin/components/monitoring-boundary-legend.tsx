import { monitoringTierAttrs } from "@/lib/monitoring-boundary";
import { CARD_SHELL } from "@/features/admin/admin-interaction-classes";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

const TIERS = ["live", "placeholder", "future"] as const;

function tierTone(tier: (typeof TIERS)[number]): string {
  if (tier === "live") return "border-emerald-500/35 bg-emerald-950/15 text-emerald-200";
  if (tier === "placeholder") return "border-sky-500/35 bg-sky-950/20 text-sky-100/90";
  return "border-amber-500/35 bg-amber-950/20 text-amber-100/90";
}

/** P8-1H — Explains which monitoring panels are live vs contract-only vs future infra. */
export function MonitoringBoundaryLegend() {
  return (
    <section
      className={cn(CARD_SHELL, "p-4 text-right")}
      aria-labelledby="monitoring-boundary-legend-title"
      {...monitoringTierAttrs("live")}
    >
      <h2 id="monitoring-boundary-legend-title" className="text-base font-semibold text-foreground">
        {t("p8.admin.monitoring.boundary.title")}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("p8.admin.monitoring.boundary.subtitle")}</p>
      <ul className="mt-4 space-y-2 text-sm">
        {TIERS.map((tier) => (
          <li
            key={tier}
            className={cn("rounded-xl border px-3 py-2.5", tierTone(tier))}
            {...monitoringTierAttrs(tier)}
          >
            <span className="font-semibold">{t(`p8.admin.monitoring.boundary.tier_${tier}`)}</span>
            <span className="mx-2 opacity-50">·</span>
            <span>{t(`p8.admin.monitoring.boundary.tier_${tier}_desc`)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">{t("p8.admin.monitoring.boundary.no_fake")}</p>
    </section>
  );
}
