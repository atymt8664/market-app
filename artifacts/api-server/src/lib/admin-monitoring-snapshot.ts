import { randomUUID } from "node:crypto";
import {
  getOpsQueueSummary,
  getStaffLoadSnapshot,
  type StaffLoadSnapshot,
} from "./admin-operations-queue";
import { ensureSlaEscalationBeforeAdminRead } from "./ops-cron";
import { buildInfrastructureHealthSnapshot } from "./admin-infrastructure-health";
import type { AdminStaffContext } from "./admin-rbac";
import { logAdminActivity } from "./admin-activity-log";
import {
  buildObservabilitySnapshot,
  buildSlowHttpEndpoints,
  computeHttpErrorRate,
  OBSERVABILITY,
} from "./observability";
import { checkDatabaseReadiness } from "./observability/readiness";
import { snapshotPgPoolStats } from "./observability/pool-stats";
import { snapshotServerMetrics } from "./observability/server-metrics";
import { snapshotWsWindow } from "./observability/ws-window";
import { countUsersWithOpenChatSockets } from "./realtime";
import { getSentryStatus } from "./sentry";
import { PUSH_DELIVERY_QUEUE_KEY } from "./push/push-queue";
import { readPushQueueMetrics } from "./push/push-queue-metrics";

export type MonitoringSeverity = "ok" | "warning" | "critical";

export type MonitoringAlert = {
  id: string;
  auditActivityId: number | null;
  severity: Exclude<MonitoringSeverity, "ok">;
  component: string;
  title: string;
  description: string;
  nextStep: string;
};

export type ComponentHealth = {
  status: MonitoringSeverity;
  latencyMs: number | null;
  detail: string;
};

export type AdminMonitoringSnapshot = {
  snapshotId: string;
  generatedAt: string;
  overallStatus: MonitoringSeverity;
  systemHealth: {
    api: ComponentHealth;
    database: ComponentHealth;
    redis: ComponentHealth;
    websocket: ComponentHealth;
    queueWorkers: ComponentHealth;
    pushWorkers: ComponentHealth;
    storage: ComponentHealth;
  };
  serverMetrics: Awaited<ReturnType<typeof snapshotServerMetrics>>;
  apiMetrics: {
    requestCount: number;
    errorRatePercent: number | null;
    slowRequestCount: number;
    latencyMs: {
      p50Ms: number | null;
      p95Ms: number | null;
      p99Ms: number | null;
    };
    slowEndpoints: ReturnType<typeof buildSlowHttpEndpoints>;
  };
  databaseMetrics: {
    slowQueryCount: number;
    queryCount: number;
    readinessLatencyMs: number | null;
    latencyMs: {
      p50Ms: number | null;
      p95Ms: number | null;
      p99Ms: number | null;
    };
    pool: ReturnType<typeof snapshotPgPoolStats>;
  };
  websocketMetrics: {
    onlineUsers: number;
    socketConnections: number;
    disconnectsTotal: number;
    window: ReturnType<typeof snapshotWsWindow>;
  };
  queueMetrics: {
    push: Awaited<ReturnType<typeof readPushQueueMetrics>>;
    queueWorkerDepth: number | null;
  };
  founder: {
    bottlenecks: StaffLoadSnapshot["bottlenecks"];
    downServices: string[];
    criticalIssues: string[];
    slaAlerts: {
      totalSlaExceeded: number;
      totalEscalation: number;
      domains: Array<{ domain: string; slaExceeded: number; escalation: number }>;
    };
    systemPressure: {
      errorRatePercent: number | null;
      poolUtilizationPercent: number | null;
      queuePending: number | null;
      overloadedStaff: number;
    };
    highErrors: boolean;
  };
  sentry: ReturnType<typeof getSentryStatus>;
  alerts: MonitoringAlert[];
};

type AlertDraft = Omit<MonitoringAlert, "id" | "auditActivityId">;

const ALERT_LOG_COOLDOWN_MS = 5 * 60 * 1000;
const alertAuditCache = new Map<string, { auditActivityId: number; loggedAt: number }>();

function mapInfraStatus(
  status: "ok" | "degraded" | "fail" | "unconfigured",
): MonitoringSeverity {
  if (status === "ok") return "ok";
  if (status === "degraded" || status === "unconfigured") return "warning";
  return "critical";
}

function worstStatus(...statuses: MonitoringSeverity[]): MonitoringSeverity {
  if (statuses.includes("critical")) return "critical";
  if (statuses.includes("warning")) return "warning";
  return "ok";
}

async function persistAlertAudit(
  alertKey: string,
  draft: AlertDraft,
  actorAdminId: number | null,
): Promise<number | null> {
  const now = Date.now();
  const cached = alertAuditCache.get(alertKey);
  if (cached && now - cached.loggedAt < ALERT_LOG_COOLDOWN_MS) {
    return cached.auditActivityId;
  }

  const auditActivityId = await logAdminActivity({
    action: "monitoring.alert",
    actorAdminId,
    targetType: "system",
    targetId: null,
    details: {
      component: draft.component,
      severity: draft.severity,
      title: draft.title,
      description: draft.description,
      nextStep: draft.nextStep,
      alertKey,
    },
  });

  if (auditActivityId != null) {
    alertAuditCache.set(alertKey, { auditActivityId, loggedAt: now });
  }
  return auditActivityId;
}

async function finalizeAlerts(
  drafts: AlertDraft[],
  actorAdminId: number | null,
): Promise<MonitoringAlert[]> {
  const alerts: MonitoringAlert[] = [];
  for (const draft of drafts) {
    const alertKey = `${draft.component}:${draft.severity}:${draft.title}`;
    const auditActivityId = await persistAlertAudit(alertKey, draft, actorAdminId);
    alerts.push({
      id: randomUUID(),
      auditActivityId,
      ...draft,
    });
  }
  return alerts;
}

export async function buildAdminMonitoringSnapshot(
  staff: AdminStaffContext,
): Promise<AdminMonitoringSnapshot> {
  const snapshotId = randomUUID();
  const generatedAt = new Date().toISOString();
  const actorAdminId = staff.actorAdminId;

  await ensureSlaEscalationBeforeAdminRead();

  const [
    readiness,
    infrastructure,
    observability,
    serverMetrics,
    pushMetrics,
    opsSummary,
    staffLoad,
  ] = await Promise.all([
    checkDatabaseReadiness(),
    buildInfrastructureHealthSnapshot(),
    Promise.resolve(buildObservabilitySnapshot()),
    snapshotServerMetrics(),
    readPushQueueMetrics(PUSH_DELIVERY_QUEUE_KEY),
    getOpsQueueSummary(staff),
    getStaffLoadSnapshot(staff),
  ]);

  const wsWindow = snapshotWsWindow();
  const pool = snapshotPgPoolStats();
  const onlineUsers = countUsersWithOpenChatSockets();
  const errorRatePercent = computeHttpErrorRate(
    observability.http.requestsTotal,
    observability.http.errors5xxTotal,
  );
  const slowEndpoints = buildSlowHttpEndpoints(10);
  const sentry = getSentryStatus();

  const apiStatus: MonitoringSeverity =
    readiness.status === "ok" ? "ok" : readiness.status === "degraded" ? "warning" : "critical";

  const dbStatus: MonitoringSeverity =
    readiness.checks.database === "ok"
      ? "ok"
      : readiness.checks.database === "timeout"
        ? "warning"
        : "critical";

  const redisStatus = mapInfraStatus(infrastructure.redis.status);
  const storageStatus = mapInfraStatus(infrastructure.storage.status);
  const pushWorkerStatus = mapInfraStatus(infrastructure.pushWorker.status);
  const queueWorkerStatus = mapInfraStatus(infrastructure.queueWorker.status);

  let wsStatus: MonitoringSeverity = "ok";
  if (wsWindow.disconnectSpike || wsWindow.reconnectSpike) wsStatus = "warning";
  if (observability.websocket.authFailuresTotal > 20) wsStatus = "warning";

  const systemHealth = {
    api: {
      status: apiStatus,
      latencyMs: readiness.latencyMs ?? null,
      detail:
        apiStatus === "ok"
          ? "واجهة API تستجيب ضمن الحدود المستهدفة"
          : "فحص جاهزية API أظهر مشكلة في الاستجابة",
    },
    database: {
      status: dbStatus,
      latencyMs: readiness.latencyMs ?? null,
      detail:
        dbStatus === "ok"
          ? "قاعدة البيانات متصلة وتستجيب"
          : dbStatus === "warning"
            ? "استجابة قاعدة البيانات بطيئة أو متأخرة"
            : "فشل الاتصال بقاعدة البيانات",
    },
    redis: {
      status: redisStatus,
      latencyMs: infrastructure.redis.latencyMs,
      detail:
        redisStatus === "ok"
          ? "Redis متصل"
          : redisStatus === "warning"
            ? "Redis غير مُعد أو متدهور"
            : "فشل Redis",
    },
    websocket: {
      status: wsStatus,
      latencyMs: null,
      detail:
        wsStatus === "ok"
          ? `${onlineUsers} مستخدم متصل عبر WebSocket`
          : "نشاط غير طبيعي في WebSocket (انقطاع/إعادة اتصال)",
    },
    queueWorkers: {
      status: queueWorkerStatus,
      latencyMs: null,
      detail:
        queueWorkerStatus === "ok"
          ? `عمق الطابور: ${infrastructure.queueWorker.queueDepth ?? 0}`
          : "عامل الطوابير غير متاح أو متدهور",
    },
    pushWorkers: {
      status: pushWorkerStatus,
      latencyMs: null,
      detail:
        pushWorkerStatus === "ok"
          ? `Push queue depth: ${infrastructure.pushWorker.queueDepth ?? 0}`
          : "عامل Push غير متاح أو متدهور",
    },
    storage: {
      status: storageStatus,
      latencyMs: infrastructure.storage.latencyMs,
      detail:
        storageStatus === "ok"
          ? "التخزين السحابي متاح"
          : storageStatus === "warning"
            ? "التخزين غير مُعد أو متدهور"
            : "فشل الوصول للتخزين",
    },
  };

  const alertDrafts: AlertDraft[] = [];

  if (systemHealth.api.status === "critical") {
    alertDrafts.push({
      severity: "critical",
      component: "api",
      title: "فشل API",
      description: "فحص جاهزية API أظهر حالة فشل — الخدمة قد لا تستجيب للمستخدمين.",
      nextStep: "راجع سجلات API والبنية التحتية فورًا، ثم أعد فحص /healthz و /readyz.",
    });
  }

  if (systemHealth.database.status === "critical") {
    alertDrafts.push({
      severity: "critical",
      component: "database",
      title: "فشل قاعدة البيانات",
      description: "الاتصال بقاعدة البيانات فشل — جميع العمليات المعتمدة على DB متوقفة.",
      nextStep: "تحقق من DATABASE_URL، حالة Supabase/Postgres، واتصال الشبكة.",
    });
  } else if (systemHealth.database.status === "warning") {
    alertDrafts.push({
      severity: "warning",
      component: "database",
      title: "بطء قاعدة البيانات",
      description: `استجابة DB ${readiness.latencyMs ?? "—"}ms — أعلى من المستهدف.`,
      nextStep: "راجع الاستعلامات البطيئة واستخدام pool أدناه.",
    });
  }

  if (systemHealth.redis.status === "critical") {
    alertDrafts.push({
      severity: "critical",
      component: "redis",
      title: "فشل Redis",
      description: "Redis غير متاح — الطوابير والـ Push والجلسات الم distributed قد تتأثر.",
      nextStep: "تحقق من REDIS_URL وحالة خادم Redis.",
    });
  }

  if (systemHealth.websocket.status === "warning") {
    alertDrafts.push({
      severity: "warning",
      component: "websocket",
      title: "نشاط WebSocket غير طبيعي",
      description: `انقطاعات: ${wsWindow.disconnectsLastMinute}/دقيقة، إعادة اتصال: ${wsWindow.connectsLastMinute}/دقيقة.`,
      nextStep: "راقب الشات والاتصالات — قد يشير لضغط أو مشكلة شبكة.",
    });
  }

  if (systemHealth.pushWorkers.status === "critical") {
    alertDrafts.push({
      severity: "critical",
      component: "push_worker",
      title: "فشل Push Worker",
      description: "مسار الإشعارات Push غير متاح.",
      nextStep: "تحقق من push-worker process و Redis queue.",
    });
  }

  if (systemHealth.storage.status === "critical") {
    alertDrafts.push({
      severity: "critical",
      component: "storage",
      title: "فشل التخزين",
      description: "Supabase Storage غير متاح.",
      nextStep: "تحقق من SUPABASE_URL ومفاتيح الخدمة.",
    });
  }

  if (errorRatePercent != null && errorRatePercent >= 5) {
    alertDrafts.push({
      severity: errorRatePercent >= 10 ? "critical" : "warning",
      component: "api_errors",
      title: "ارتفاع معدل الأخطاء",
      description: `معدل أخطاء 5xx: ${errorRatePercent}% (${observability.http.errors5xxTotal}/${observability.http.requestsTotal}).`,
      nextStep: "راجع slow endpoints وسجلات Sentry.",
    });
  }

  const p95 = observability.http.latencyMs.p95Ms;
  if (p95 != null && p95 >= OBSERVABILITY.slowHttpMs * 2) {
    alertDrafts.push({
      severity: p95 >= OBSERVABILITY.slowHttpMs * 4 ? "critical" : "warning",
      component: "api_latency",
      title: "ارتفاع زمن الاستجابة",
      description: `p95 latency: ${p95}ms (هدف: <${OBSERVABILITY.slowHttpMs}ms).`,
      nextStep: "راجع slow endpoints وضغط DB/Redis.",
    });
  }

  if (pool.utilizationPercent != null && pool.utilizationPercent >= 85) {
    alertDrafts.push({
      severity: pool.utilizationPercent >= 95 ? "critical" : "warning",
      component: "db_pool",
      title: "ضغط على Database Pool",
      description: `استخدام pool: ${pool.utilizationPercent}% (${pool.totalCount - pool.idleCount}/${pool.maxConnections}).`,
      nextStep: "راجع الاستعلامات البطيئة وزِد PG_POOL_MAX إذا لزم.",
    });
  }

  if (opsSummary.totals.slaExceeded > 0) {
    alertDrafts.push({
      severity: opsSummary.totals.slaExceeded >= 10 ? "critical" : "warning",
      component: "sla",
      title: "تنبيهات SLA",
      description: `${opsSummary.totals.slaExceeded} عنصر تجاوز SLA عبر كل الأقسام.`,
      nextStep: "افتح Operations Queue Intelligence لتصعيد وإسناد.",
    });
  }

  if (pushMetrics.pending != null && pushMetrics.pending >= 100) {
    alertDrafts.push({
      severity: pushMetrics.pending >= 500 ? "critical" : "warning",
      component: "push_queue",
      title: "تراكم Push Queue",
      description: `${pushMetrics.pending} مهمة Push معلّقة.`,
      nextStep: "تحقق من push-worker و Redis.",
    });
  }

  const downServices = Object.entries(systemHealth)
    .filter(([, health]) => health.status === "critical")
    .map(([key]) => key);

  const criticalIssues = alertDrafts
    .filter((a) => a.severity === "critical")
    .map((a) => a.title);

  const overloadedStaff = staffLoad.staff.filter((s) => s.isOverloaded).length;

  const alerts = await finalizeAlerts(alertDrafts, actorAdminId);

  const overallStatus = worstStatus(
    ...Object.values(systemHealth).map((h) => h.status),
    alerts.some((a) => a.severity === "critical") ? "critical" : "ok",
    alerts.some((a) => a.severity === "warning") ? "warning" : "ok",
  );

  return {
    snapshotId,
    generatedAt,
    overallStatus,
    systemHealth,
    serverMetrics,
    apiMetrics: {
      requestCount: observability.http.requestsTotal,
      errorRatePercent,
      slowRequestCount: observability.http.slowTotal,
      latencyMs: {
        p50Ms: observability.http.latencyMs.p50Ms,
        p95Ms: observability.http.latencyMs.p95Ms,
        p99Ms: observability.http.latencyMs.p99Ms,
      },
      slowEndpoints,
    },
    databaseMetrics: {
      slowQueryCount: observability.database.slowTotal,
      queryCount: observability.database.queriesTotal,
      readinessLatencyMs: readiness.latencyMs ?? null,
      latencyMs: {
        p50Ms: observability.database.latencyMs.p50Ms,
        p95Ms: observability.database.latencyMs.p95Ms,
        p99Ms: observability.database.latencyMs.p99Ms,
      },
      pool,
    },
    websocketMetrics: {
      onlineUsers,
      socketConnections: observability.websocket.connectionsCurrent,
      disconnectsTotal: observability.websocket.disconnectsTotal,
      window: wsWindow,
    },
    queueMetrics: {
      push: pushMetrics,
      queueWorkerDepth: infrastructure.queueWorker.queueDepth,
    },
    founder: {
      bottlenecks: staffLoad.bottlenecks,
      downServices,
      criticalIssues,
      slaAlerts: {
        totalSlaExceeded: opsSummary.totals.slaExceeded,
        totalEscalation: opsSummary.totals.escalation,
        domains: opsSummary.domains.map((d) => ({
          domain: d.domain,
          slaExceeded: d.slaExceeded,
          escalation: d.escalation,
        })),
      },
      systemPressure: {
        errorRatePercent,
        poolUtilizationPercent: pool.utilizationPercent,
        queuePending: pushMetrics.pending,
        overloadedStaff,
      },
      highErrors: errorRatePercent != null && errorRatePercent >= 5,
    },
    sentry,
    alerts,
  };
}
