/** Analytics rollup job payloads (P15-3F). */
export type AnalyticsDailyPayload = {
  trigger: "cron" | "manual" | "smoke";
  dryRun?: boolean;
};

export type AnalyticsDailyResult = {
  periodsWritten: number;
  snapshotDate: string;
};
