export type WebVitalMetric = "LCP" | "INP" | "CLS";

export type WebVitalRating = "good" | "needs-improvement" | "poor";

/** Google CWV "Good" thresholds (P13-3 SLO). */
export const CWV_SLO = {
  LCP_MS: 2500,
  INP_MS: 200,
  CLS: 0.1,
} as const;

export function rateWebVital(metric: WebVitalMetric, value: number): WebVitalRating {
  if (!Number.isFinite(value) || value < 0) return "poor";

  switch (metric) {
    case "LCP":
      if (value <= CWV_SLO.LCP_MS) return "good";
      if (value <= 4000) return "needs-improvement";
      return "poor";
    case "INP":
      if (value <= CWV_SLO.INP_MS) return "good";
      if (value <= 500) return "needs-improvement";
      return "poor";
    case "CLS":
      if (value <= CWV_SLO.CLS) return "good";
      if (value <= 0.25) return "needs-improvement";
      return "poor";
    default:
      return "poor";
  }
}
