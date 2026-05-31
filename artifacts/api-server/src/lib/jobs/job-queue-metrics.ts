/** In-process job counters (per process; pg-boss stats are source of truth for depth). */

export type JobMetricKind = "enqueued" | "processed" | "failed";

const emailCounters: Record<JobMetricKind, number> = {
  enqueued: 0,
  processed: 0,
  failed: 0,
};

const notificationCounters: Record<JobMetricKind, number> = {
  enqueued: 0,
  processed: 0,
  failed: 0,
};

export function incrementEmailJobMetric(kind: JobMetricKind, delta = 1): void {
  emailCounters[kind] += delta;
}

export function readEmailJobMetrics(): Readonly<Record<JobMetricKind, number>> {
  return { ...emailCounters };
}

export function incrementNotificationJobMetric(
  kind: JobMetricKind,
  delta = 1,
): void {
  notificationCounters[kind] += delta;
}

export function readNotificationJobMetrics(): Readonly<
  Record<JobMetricKind, number>
> {
  return { ...notificationCounters };
}

export function resetJobMetricsForTests(): void {
  emailCounters.enqueued = 0;
  emailCounters.processed = 0;
  emailCounters.failed = 0;
  notificationCounters.enqueued = 0;
  notificationCounters.processed = 0;
  notificationCounters.failed = 0;
}

/** @deprecated use resetJobMetricsForTests */
export function resetEmailJobMetricsForTests(): void {
  resetJobMetricsForTests();
}
