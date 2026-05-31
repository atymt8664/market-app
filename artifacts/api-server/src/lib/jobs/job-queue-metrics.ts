/** In-process counters for P15-3 email outbox (per process; pg-boss stats are source of truth for depth). */

export type EmailJobMetricKind = "enqueued" | "processed" | "failed";

const emailCounters: Record<EmailJobMetricKind, number> = {
  enqueued: 0,
  processed: 0,
  failed: 0,
};

export function incrementEmailJobMetric(
  kind: EmailJobMetricKind,
  delta = 1,
): void {
  emailCounters[kind] += delta;
}

export function readEmailJobMetrics(): Readonly<Record<EmailJobMetricKind, number>> {
  return { ...emailCounters };
}

export function resetEmailJobMetricsForTests(): void {
  emailCounters.enqueued = 0;
  emailCounters.processed = 0;
  emailCounters.failed = 0;
}
