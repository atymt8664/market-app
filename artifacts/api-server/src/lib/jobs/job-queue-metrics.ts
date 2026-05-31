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

const pushCounters: Record<JobMetricKind, number> = {
  enqueued: 0,
  processed: 0,
  failed: 0,
};

const opsCounters: Record<JobMetricKind, number> = {
  enqueued: 0,
  processed: 0,
  failed: 0,
};

let lastOpsSlaEscalationResult: Record<string, number> | null = null;
let lastOpsSlaEscalationAt: string | null = null;

const analyticsCounters: Record<JobMetricKind, number> = {
  enqueued: 0,
  processed: 0,
  failed: 0,
};

let lastAnalyticsDailyRollup: {
  periodsWritten: number;
  snapshotDate: string;
} | null = null;
let lastAnalyticsDailyRollupAt: string | null = null;

const mediaCounters: Record<JobMetricKind, number> = {
  enqueued: 0,
  processed: 0,
  failed: 0,
};

let lastMediaPurgeResult: { userId: number; pathsRemoved: number } | null = null;
let lastMediaPurgeAt: string | null = null;

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

export function incrementPushJobMetric(kind: JobMetricKind, delta = 1): void {
  pushCounters[kind] += delta;
}

export function readPushJobMetrics(): Readonly<Record<JobMetricKind, number>> {
  return { ...pushCounters };
}

export function incrementOpsJobMetric(kind: JobMetricKind, delta = 1): void {
  opsCounters[kind] += delta;
}

export function readOpsJobMetrics(): Readonly<Record<JobMetricKind, number>> {
  return { ...opsCounters };
}

export function recordOpsSlaEscalationResult(
  result: Record<string, number>,
): void {
  lastOpsSlaEscalationResult = { ...result };
  lastOpsSlaEscalationAt = new Date().toISOString();
}

export function readLastOpsSlaEscalation(): {
  at: string | null;
  result: Record<string, number> | null;
} {
  return {
    at: lastOpsSlaEscalationAt,
    result: lastOpsSlaEscalationResult ? { ...lastOpsSlaEscalationResult } : null,
  };
}

export function incrementAnalyticsJobMetric(kind: JobMetricKind, delta = 1): void {
  analyticsCounters[kind] += delta;
}

export function readAnalyticsJobMetrics(): Readonly<Record<JobMetricKind, number>> {
  return { ...analyticsCounters };
}

export function recordAnalyticsDailyRollupResult(result: {
  periodsWritten: number;
  snapshotDate: string;
}): void {
  lastAnalyticsDailyRollup = { ...result };
  lastAnalyticsDailyRollupAt = new Date().toISOString();
}

export function readLastAnalyticsDailyRollup(): {
  at: string | null;
  result: { periodsWritten: number; snapshotDate: string } | null;
} {
  return {
    at: lastAnalyticsDailyRollupAt,
    result: lastAnalyticsDailyRollup ? { ...lastAnalyticsDailyRollup } : null,
  };
}

export function incrementMediaJobMetric(kind: JobMetricKind, delta = 1): void {
  mediaCounters[kind] += delta;
}

export function readMediaJobMetrics(): Readonly<Record<JobMetricKind, number>> {
  return { ...mediaCounters };
}

export function recordMediaPurgeResult(result: {
  userId: number;
  pathsRemoved: number;
}): void {
  lastMediaPurgeResult = { ...result };
  lastMediaPurgeAt = new Date().toISOString();
}

export function readLastMediaPurge(): {
  at: string | null;
  result: { userId: number; pathsRemoved: number } | null;
} {
  return {
    at: lastMediaPurgeAt,
    result: lastMediaPurgeResult ? { ...lastMediaPurgeResult } : null,
  };
}

export function resetJobMetricsForTests(): void {
  emailCounters.enqueued = 0;
  emailCounters.processed = 0;
  emailCounters.failed = 0;
  notificationCounters.enqueued = 0;
  notificationCounters.processed = 0;
  notificationCounters.failed = 0;
  pushCounters.enqueued = 0;
  pushCounters.processed = 0;
  pushCounters.failed = 0;
  opsCounters.enqueued = 0;
  opsCounters.processed = 0;
  opsCounters.failed = 0;
  analyticsCounters.enqueued = 0;
  analyticsCounters.processed = 0;
  analyticsCounters.failed = 0;
  lastOpsSlaEscalationResult = null;
  lastOpsSlaEscalationAt = null;
  lastAnalyticsDailyRollup = null;
  lastAnalyticsDailyRollupAt = null;
  mediaCounters.enqueued = 0;
  mediaCounters.processed = 0;
  mediaCounters.failed = 0;
  lastMediaPurgeResult = null;
  lastMediaPurgeAt = null;
}

/** @deprecated use resetJobMetricsForTests */
export function resetEmailJobMetricsForTests(): void {
  resetJobMetricsForTests();
}
