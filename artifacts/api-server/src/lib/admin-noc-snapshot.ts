import {
  adminActivityLogsTable,
  adsTable,
  db,
  reportsTable,
  supportTicketsTable,
  usersTable,
} from "@workspace/db";
import { count, desc, eq, gte } from "drizzle-orm";
import { buildInfrastructureHealthSnapshot } from "./admin-infrastructure-health";
import { buildObservabilitySnapshot } from "./observability";
import { checkDatabaseReadiness } from "./observability/readiness";
import { countUsersWithOpenChatSockets } from "./realtime";

import { loadAdminLogActorMap } from "./admin-log-actors";
import {
  FOUNDER_ADMIN_ACTOR_ID,
  FOUNDER_DISPLAY_NAME,
  FOUNDER_ROLE_KEY,
  COMPANY_NAME,
  type AdminRoleKey,
  isAdminRoleKey,
  staffDisplayName,
} from "./admin-staff";
import { countOpenVerificationRequests, countPendingVerificationQueue } from "./admin-verification-workflow";

const ABUSE_SPIKE_REPORTS_LAST_HOUR = 8;

export type AdminNocQueueItem = {
  key: string;
  labelKey: string;
  count: number;
  href: string;
};

export type AdminNocNeedsActionItem = {
  key: string;
  labelKey: string;
  count: number;
  href: string;
  severity: "critical" | "warning" | "info";
  /** False when count is always 0 until a future P ships backend. */
  dataAvailable: boolean;
};

export type AdminNocActivityActor = {
  id: number | null;
  roleKey:
    | "founder"
    | "moderator"
    | "support"
    | "verification"
    | "analyst"
    | "admin_manager"
    | "finance_manager"
    | "system"
    | "user";
  displayName?: string | null;
};

export type AdminNocActivityItem = {
  id: string;
  kind: "admin_action" | "ad_created" | "report_created" | "user_registered" | "support_created";
  createdAt: string;
  href: string | null;
  actor: AdminNocActivityActor;
  /** i18n key suffix under p8.admin.activity.actions.* (dots → underscores) */
  actionKey: string;
  target: {
    type: string;
    id: number | null;
  } | null;
  reason: string | null;
  /** Optional context for i18n interpolation (user/ad names from DB). */
  context: Record<string, string>;
};

export type AdminNocPriorityLevel = "critical" | "warning" | "normal";

export type AdminNocPriorityItem = {
  key: string;
  level: AdminNocPriorityLevel;
  labelKey: string;
  count: number;
  href: string | null;
  dataAvailable: boolean;
};

export type AdminNocExecutiveHeader = {
  companyName: string;
  founderName: string;
  founderRoleKey: typeof FOUNDER_ROLE_KEY;
  permissionsKey: "p8.admin.executive.permissions.full";
  lastUpdatedAt: string;
  today: {
    newUsers: number;
    newAds: number;
    newReports: number;
    newSupport: number;
  };
  interventionCount: number;
};

export type AdminNocUserIntelligence = {
  onlineNow: number;
  activeLast5Minutes: number;
  activeToday: number;
  newUsersToday: number;
  blockedUsers: number;
  pendingVerification: number;
  pendingVerificationDataAvailable: boolean;
};

export type AdminNocSystemHealthKey =
  | "api"
  | "websocket"
  | "ram"
  | "cpu"
  | "database"
  | "redis"
  | "storage"
  | "push_worker"
  | "queue_worker"
  | "p95_latency";

export type AdminNocSystemHealthItem = {
  key: AdminNocSystemHealthKey;
  status: "ok" | "warn" | "fail" | "muted" | "unconfigured";
  value: string | number | null;
  hintParams?: Record<string, string | number>;
};

export type AdminNocFounderIdentity = {
  displayName: string;
  roleKey: typeof FOUNDER_ROLE_KEY;
  roleLabelKey: "p8.admin.roles.founder.title";
  permissionsLabelKey: "p8.admin.executive.permissions.full";
};

export type AdminNocSnapshot = {
  executiveHeader: AdminNocExecutiveHeader;
  founderIdentity: AdminNocFounderIdentity;
  userIntelligence: AdminNocUserIntelligence;
  priorityItems: AdminNocPriorityItem[];
  systemHealthGrid: AdminNocSystemHealthItem[];
  needsActionNow: AdminNocNeedsActionItem[];
  liveSystemStatus: {
    onlineUsersNow: number;
    activeLast5Minutes: number;
    todayActiveUsers: number;
    pendingAds: number;
    openReports: number;
    openSupportTickets: number;
    avatarReviewPending: number;
    verificationPending: number;
    criticalIssues: number;
    apiHealth: {
      healthz: "ok";
      readyz: "ready" | "not_ready";
      dbLatencyMs: number | null;
    };
    websocket: {
      connectionsCurrent: number;
      usersWithOpenSockets: number;
      authFailuresTotal: number;
      disconnectsTotal: number;
    };
    apiLatency: {
      count: number;
      p50Ms: number | null;
      p95Ms: number | null;
      avgMs: number | null;
    };
    ram: {
      rssMb: number;
      heapUsedMb: number;
      heapTotalMb: number;
    };
    cpu: {
      available: false;
      placeholderKey: "p8.admin.noc.cpu.waiting_host_metrics";
    };
  };
  queueCenter: AdminNocQueueItem[];
  recentActivity: AdminNocActivityItem[];
};

const OPEN_REPORT_STATUSES = ["open", "under_review", "pending", "in_review"] as const;
const OPEN_SUPPORT_STATUSES = ["open", "pending"] as const;

function activityHref(
  targetType: string | null | undefined,
  targetId: number | null | undefined,
): string | null {
  if (targetId == null || !Number.isInteger(targetId) || targetId <= 0) return null;
  switch (targetType) {
    case "ad":
      return `/admin/ads?focusId=${targetId}`;
    case "report":
      return `/admin/reports?reportId=${targetId}`;
    case "support_ticket":
      return `/admin/support?ticketId=${targetId}`;
    case "user":
      return `/admin/users/${targetId}`;
    default:
      return null;
  }
}

function toNocActorRoleKey(roleKey: AdminRoleKey): AdminNocActivityActor["roleKey"] {
  if (roleKey === "founder") return "founder";
  if (roleKey === "support") return "support";
  if (roleKey === "verification") return "verification";
  if (roleKey === "analyst") return "analyst";
  if (roleKey === "admin_manager") return "admin_manager";
  if (roleKey === "finance_manager") return "finance_manager";
  return "moderator";
}

function resolveAdminActor(
  actorAdminId: number | null,
  actorMap: Map<number, import("./admin-log-actors").AdminLogActorInfo>,
): AdminNocActivityActor {
  if (actorAdminId === FOUNDER_ADMIN_ACTOR_ID) {
    return { id: FOUNDER_ADMIN_ACTOR_ID, roleKey: "founder", displayName: FOUNDER_DISPLAY_NAME };
  }
  if (actorAdminId != null && actorAdminId > 0) {
    const info = actorMap.get(actorAdminId);
    const roleKey = info?.roleKey && isAdminRoleKey(info.roleKey) ? info.roleKey : "moderator";
    return {
      id: actorAdminId,
      roleKey: toNocActorRoleKey(roleKey),
      displayName: info?.displayName ?? staffDisplayName(actorAdminId),
    };
  }
  return { id: null, roleKey: "system" };
}

function extractReason(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const record = details as Record<string, unknown>;
  for (const key of ["reason", "rejectReason", "note", "description"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim().slice(0, 300);
    }
  }
  const fromStatus = record.fromStatus;
  const toStatus = record.toStatus;
  if (typeof fromStatus === "string" && typeof toStatus === "string") {
    return `${fromStatus} → ${toStatus}`;
  }
  return null;
}

function actionKeyFromLog(action: string): string {
  return action.replace(/\./g, "_");
}

async function buildRecentActivity(): Promise<AdminNocActivityItem[]> {
  const items: AdminNocActivityItem[] = [];

  try {
    const adminRows = await db
      .select({
        id: adminActivityLogsTable.id,
        action: adminActivityLogsTable.action,
        actorAdminId: adminActivityLogsTable.actorAdminId,
        targetType: adminActivityLogsTable.targetType,
        targetId: adminActivityLogsTable.targetId,
        details: adminActivityLogsTable.details,
        createdAt: adminActivityLogsTable.createdAt,
      })
      .from(adminActivityLogsTable)
      .orderBy(desc(adminActivityLogsTable.createdAt), desc(adminActivityLogsTable.id))
      .limit(20);

    const actorMap = await loadAdminLogActorMap(adminRows.map((row) => row.actorAdminId));

    for (const row of adminRows) {
      if (!row.createdAt) continue;
      items.push({
        id: `admin-log-${row.id}`,
        kind: "admin_action",
        createdAt: row.createdAt.toISOString(),
        href: activityHref(row.targetType, row.targetId),
        actor: resolveAdminActor(row.actorAdminId, actorMap),
        actionKey: actionKeyFromLog(row.action),
        target: row.targetId
          ? { type: row.targetType, id: row.targetId }
          : null,
        reason: extractReason(row.details),
        context: {},
      });
    }
  } catch {
    /* activity table may be empty on fresh env */
  }

  const recentAds = await db
    .select({
      id: adsTable.id,
      title: adsTable.title,
      sellerName: adsTable.sellerName,
      createdAt: adsTable.createdAt,
    })
    .from(adsTable)
    .orderBy(desc(adsTable.createdAt), desc(adsTable.id))
    .limit(10);

  for (const row of recentAds) {
    if (!row.createdAt) continue;
    items.push({
      id: `ad-created-${row.id}`,
      kind: "ad_created",
      createdAt: row.createdAt.toISOString(),
      href: `/admin/ads?focusId=${row.id}`,
      actor: { id: null, roleKey: "user" },
      actionKey: "ad_published",
      target: { type: "ad", id: row.id },
      reason: null,
      context: {
        sellerName: row.sellerName?.trim() || "",
        adTitle: row.title?.trim() || "",
      },
    });
  }

  const recentReports = await db
    .select({
      id: reportsTable.id,
      reason: reportsTable.reason,
      createdAt: reportsTable.createdAt,
    })
    .from(reportsTable)
    .orderBy(desc(reportsTable.createdAt), desc(reportsTable.id))
    .limit(10);

  for (const row of recentReports) {
    if (!row.createdAt) continue;
    items.push({
      id: `report-created-${row.id}`,
      kind: "report_created",
      createdAt: row.createdAt.toISOString(),
      href: `/admin/reports?reportId=${row.id}`,
      actor: { id: null, roleKey: "user" },
      actionKey: "report_created",
      target: { type: "report", id: row.id },
      reason: row.reason?.trim() || null,
      context: {},
    });
  }

  const recentUsers = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.createdAt), desc(usersTable.id))
    .limit(10);

  for (const row of recentUsers) {
    if (!row.createdAt) continue;
    items.push({
      id: `user-registered-${row.id}`,
      kind: "user_registered",
      createdAt: row.createdAt.toISOString(),
      href: `/admin/users/${row.id}`,
      actor: { id: row.id, roleKey: "user" },
      actionKey: "user_registered",
      target: { type: "user", id: row.id },
      reason: null,
      context: {
        userName: row.name?.trim() || "",
      },
    });
  }

  try {
    const recentSupport = await db
      .select({
        id: supportTicketsTable.id,
        subject: supportTicketsTable.subject,
        createdAt: supportTicketsTable.createdAt,
      })
      .from(supportTicketsTable)
      .orderBy(desc(supportTicketsTable.createdAt), desc(supportTicketsTable.id))
      .limit(10);

    for (const row of recentSupport) {
      if (!row.createdAt) continue;
      items.push({
        id: `support-created-${row.id}`,
        kind: "support_created",
        createdAt: row.createdAt.toISOString(),
        href: `/admin/support?ticketId=${row.id}`,
        actor: { id: null, roleKey: "user" },
        actionKey: "support_ticket_created",
        target: { type: "support_ticket", id: row.id },
        reason: row.subject?.trim() || null,
        context: {},
      });
    }
  } catch {
    /* support table optional on older schemas */
  }

  return items
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 30);
}

function mapInfraStatus(
  status: "ok" | "degraded" | "fail" | "unconfigured",
): AdminNocSystemHealthItem["status"] {
  if (status === "ok") return "ok";
  if (status === "degraded") return "warn";
  if (status === "fail") return "fail";
  return "unconfigured";
}

export async function buildAdminNocSnapshot(params: {
  pendingAds: number;
  openReports: number;
  openSupportTickets: number;
  newUsersToday: number;
  newAdsToday: number;
  newReportsToday: number;
  newSupportToday: number;
  blockedUsers: number;
}): Promise<AdminNocSnapshot> {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const [
    active5mRow,
    todayActiveRow,
    avatarReviewRow,
    unverifiedEmailRow,
    reportsLastHourRow,
    newSupportTodayRow,
    readiness,
    metricsSnapshot,
    infrastructure,
    verificationOpenCount,
    verificationPendingQueueCount,
  ] = await Promise.all([
    db
      .select({ value: count(usersTable.id) })
      .from(usersTable)
      .where(gte(usersTable.lastSeenAt, fiveMinutesAgo))
      .then((rows) => rows[0]),
    db
      .select({ value: count(usersTable.id) })
      .from(usersTable)
      .where(gte(usersTable.lastSeenAt, startOfToday))
      .then((rows) => rows[0]),
    db
      .select({ value: count(usersTable.id) })
      .from(usersTable)
      .where(eq(usersTable.avatarPendingReview, true))
      .then((rows) => rows[0]),
    db
      .select({ value: count(usersTable.id) })
      .from(usersTable)
      .where(eq(usersTable.emailVerified, false))
      .then((rows) => rows[0]),
    db
      .select({ value: count(reportsTable.id) })
      .from(reportsTable)
      .where(gte(reportsTable.createdAt, oneHourAgo))
      .then((rows) => rows[0]),
    db
      .select({ value: count(supportTicketsTable.id) })
      .from(supportTicketsTable)
      .where(gte(supportTicketsTable.createdAt, startOfToday))
      .then((rows) => rows[0]),
    checkDatabaseReadiness(),
    Promise.resolve(buildObservabilitySnapshot()),
    buildInfrastructureHealthSnapshot(),
    countOpenVerificationRequests().catch(() => 0),
    countPendingVerificationQueue().catch(() => 0),
  ]);

  const onlineUsersNow = countUsersWithOpenChatSockets();
  const pendingAds = params.pendingAds;
  const openReports = params.openReports;
  const openSupportTickets = params.openSupportTickets;
  const avatarReviewCount = Number(avatarReviewRow?.value ?? 0);
  const verificationPending = Number(unverifiedEmailRow?.value ?? 0);
  const reportsLastHour = Number(reportsLastHourRow?.value ?? 0);
  const readyzOk = readiness.status === "ok";
  const wsHealthy =
    metricsSnapshot.websocket.authFailuresTotal === 0 ||
    metricsSnapshot.websocket.connectionsCurrent >=
      metricsSnapshot.websocket.usersWithOpenSockets;
  const abuseSpike = reportsLastHour >= ABUSE_SPIKE_REPORTS_LAST_HOUR;
  const apiDown = false;
  const criticalIssues =
    (readyzOk ? 0 : 1) +
    (wsHealthy ? 0 : 1) +
    (abuseSpike ? 1 : 0) +
    (apiDown ? 1 : 0);

  const needsActionNow: AdminNocNeedsActionItem[] = [
    {
      key: "pending_ads",
      labelKey: "p8.admin.needs_action.pending_ads",
      count: pendingAds,
      href: "/admin/ads?status=pending",
      severity: pendingAds > 0 ? "warning" : "info",
      dataAvailable: true,
    },
    {
      key: "open_reports",
      labelKey: "p8.admin.needs_action.open_reports",
      count: openReports,
      href: "/admin/reports?status=open",
      severity: openReports > 0 ? "warning" : "info",
      dataAvailable: true,
    },
    {
      key: "open_support",
      labelKey: "p8.admin.needs_action.open_support",
      count: openSupportTickets,
      href: "/admin/support?status=open",
      severity: openSupportTickets > 0 ? "warning" : "info",
      dataAvailable: true,
    },
    {
      key: "avatar_review",
      labelKey: "p8.admin.needs_action.avatar_review",
      count: avatarReviewCount,
      href: "/admin/users?avatarReview=pending",
      severity: avatarReviewCount > 0 ? "warning" : "info",
      dataAvailable: true,
    },
    {
      key: "verification_requests",
      labelKey: "p8.admin.needs_action.verification_requests",
      count: verificationPending,
      href: "/admin/users?status=unverified",
      severity: verificationPending > 0 ? "warning" : "info",
      dataAvailable: true,
    },
    {
      key: "critical_issues",
      labelKey: "p8.admin.needs_action.critical_issues",
      count: criticalIssues,
      href: "/admin",
      severity: criticalIssues > 0 ? "critical" : "info",
      dataAvailable: true,
    },
  ];

  const queueCenter: AdminNocQueueItem[] = [
    {
      key: "pending_ads",
      labelKey: "p8.admin.queue.pending_ads",
      count: pendingAds,
      href: "/admin/ads?status=pending",
    },
    {
      key: "reports_queue",
      labelKey: "p8.admin.queue.reports",
      count: openReports,
      href: "/admin/reports?status=open",
    },
    {
      key: "support_queue",
      labelKey: "p8.admin.queue.support",
      count: openSupportTickets,
      href: "/admin/support?status=open",
    },
    {
      key: "avatar_review",
      labelKey: "p8.admin.queue.avatar_review",
      count: avatarReviewCount,
      href: "/admin/users?avatarReview=pending",
    },
  ];

  const recentActivity = await buildRecentActivity();
  const generatedAt = new Date().toISOString();

  const interventionCount = needsActionNow.filter(
    (item) => item.dataAvailable && item.count > 0 && item.severity !== "info",
  ).length;

  const priorityItems: AdminNocPriorityItem[] = [
    {
      key: "api_down",
      level: "critical",
      labelKey: "p8.admin.priority.api_down",
      count: apiDown ? 1 : 0,
      href: "/admin",
      dataAvailable: true,
    },
    {
      key: "readyz_fail",
      level: "critical",
      labelKey: "p8.admin.priority.readyz_fail",
      count: readyzOk ? 0 : 1,
      href: "/admin",
      dataAvailable: true,
    },
    {
      key: "websocket_failure",
      level: "critical",
      labelKey: "p8.admin.priority.websocket_failure",
      count: wsHealthy ? 0 : 1,
      href: "/admin",
      dataAvailable: true,
    },
    {
      key: "abuse_spike",
      level: "critical",
      labelKey: "p8.admin.priority.abuse_spike",
      count: abuseSpike ? reportsLastHour : 0,
      href: "/admin/reports?status=open",
      dataAvailable: true,
    },
    {
      key: "pending_ads",
      level: "warning",
      labelKey: "p8.admin.priority.pending_ads",
      count: pendingAds,
      href: "/admin/ads?status=pending",
      dataAvailable: true,
    },
    {
      key: "open_reports",
      level: "warning",
      labelKey: "p8.admin.priority.open_reports",
      count: openReports,
      href: "/admin/reports?status=open",
      dataAvailable: true,
    },
    {
      key: "open_support",
      level: "warning",
      labelKey: "p8.admin.priority.open_support",
      count: openSupportTickets,
      href: "/admin/support?status=open",
      dataAvailable: true,
    },
    {
      key: "avatar_review",
      level: "warning",
      labelKey: "p8.admin.priority.avatar_review",
      count: avatarReviewCount,
      href: "/admin/users?avatarReview=pending",
      dataAvailable: true,
    },
    {
      key: "verification_queue",
      level: verificationOpenCount > 0 ? "warning" : "normal",
      labelKey: "p8.admin.priority.verification_queue",
      count: verificationOpenCount,
      href: "/admin/verification",
      dataAvailable: true,
    },
    {
      key: "system_healthy",
      level: "normal",
      labelKey: "p8.admin.priority.system_healthy",
      count: criticalIssues === 0 && interventionCount === 0 ? 1 : 0,
      href: null,
      dataAvailable: true,
    },
    {
      key: "statistics",
      level: "normal",
      labelKey: "p8.admin.priority.statistics",
      count: params.newUsersToday + params.newAdsToday,
      href: "/admin/stats",
      dataAvailable: true,
    },
  ];

  const systemHealthGrid: AdminNocSystemHealthItem[] = [
    {
      key: "api",
      status: readyzOk ? "ok" : "fail",
      value: readyzOk ? "ok" : "fail",
      hintParams: {
        healthz: "ok",
        readyz: readyzOk ? "ready" : "not_ready",
      },
    },
    {
      key: "websocket",
      status: wsHealthy ? "ok" : "fail",
      value: metricsSnapshot.websocket.connectionsCurrent,
      hintParams: {
        users: metricsSnapshot.websocket.usersWithOpenSockets,
        failures: metricsSnapshot.websocket.authFailuresTotal,
      },
    },
    {
      key: "ram",
      status: "ok",
      value: Math.round(metricsSnapshot.process.memoryRssMb),
      hintParams: {
        used: Math.round(metricsSnapshot.process.memoryHeapUsedMb),
        total: Math.round(metricsSnapshot.process.memoryHeapTotalMb),
      },
    },
    {
      key: "cpu",
      status: "muted",
      value: null,
    },
    {
      key: "database",
      status: readyzOk ? "ok" : "fail",
      value: readiness.latencyMs ?? null,
    },
    {
      key: "redis",
      status: mapInfraStatus(infrastructure.redis.status),
      value: infrastructure.redis.latencyMs,
      hintParams: infrastructure.redis.queueDepth != null
        ? { depth: infrastructure.redis.queueDepth }
        : undefined,
    },
    {
      key: "storage",
      status: mapInfraStatus(infrastructure.storage.status),
      value: infrastructure.storage.latencyMs,
    },
    {
      key: "push_worker",
      status: mapInfraStatus(infrastructure.pushWorker.status),
      value: infrastructure.pushWorker.queueDepth,
      hintParams: infrastructure.pushWorker.configured ? { configured: 1 } : { configured: 0 },
    },
    {
      key: "queue_worker",
      status: mapInfraStatus(infrastructure.queueWorker.status),
      value: infrastructure.queueWorker.queueDepth,
    },
    {
      key: "p95_latency",
      status:
        metricsSnapshot.http.latencyMs.p95Ms != null &&
        metricsSnapshot.http.latencyMs.p95Ms > 2000
          ? "warn"
          : "ok",
      value: metricsSnapshot.http.latencyMs.p95Ms,
      hintParams: {
        p50: metricsSnapshot.http.latencyMs.p50Ms ?? 0,
        count: metricsSnapshot.http.latencyMs.count,
      },
    },
  ];

  return {
    executiveHeader: {
      companyName: COMPANY_NAME,
      founderName: FOUNDER_DISPLAY_NAME,
      founderRoleKey: FOUNDER_ROLE_KEY,
      permissionsKey: "p8.admin.executive.permissions.full",
      lastUpdatedAt: generatedAt,
      today: {
        newUsers: params.newUsersToday,
        newAds: params.newAdsToday,
        newReports: params.newReportsToday,
        newSupport: Number(newSupportTodayRow?.value ?? params.newSupportToday),
      },
      interventionCount,
    },
    founderIdentity: {
      displayName: FOUNDER_DISPLAY_NAME,
      roleKey: FOUNDER_ROLE_KEY,
      roleLabelKey: "p8.admin.roles.founder.title",
      permissionsLabelKey: "p8.admin.executive.permissions.full",
    },
    userIntelligence: {
      onlineNow:
        Number.isFinite(onlineUsersNow) && onlineUsersNow >= 0 ? onlineUsersNow : 0,
      activeLast5Minutes: Number(active5mRow?.value ?? 0),
      activeToday: Number(todayActiveRow?.value ?? 0),
      newUsersToday: params.newUsersToday,
      blockedUsers: params.blockedUsers,
      pendingVerification: verificationPending,
      pendingVerificationDataAvailable: true,
    },
    priorityItems,
    systemHealthGrid,
    needsActionNow,
    liveSystemStatus: {
      onlineUsersNow:
        Number.isFinite(onlineUsersNow) && onlineUsersNow >= 0 ? onlineUsersNow : 0,
      activeLast5Minutes: Number(active5mRow?.value ?? 0),
      todayActiveUsers: Number(todayActiveRow?.value ?? 0),
      pendingAds,
      openReports,
      openSupportTickets,
      avatarReviewPending: avatarReviewCount,
      verificationPending,
      criticalIssues,
      apiHealth: {
        healthz: "ok",
        readyz: readyzOk ? "ready" : "not_ready",
        dbLatencyMs:
          readiness.latencyMs !== undefined ? Number(readiness.latencyMs) : null,
      },
      websocket: {
        connectionsCurrent: metricsSnapshot.websocket.connectionsCurrent,
        usersWithOpenSockets: metricsSnapshot.websocket.usersWithOpenSockets,
        authFailuresTotal: metricsSnapshot.websocket.authFailuresTotal,
        disconnectsTotal: metricsSnapshot.websocket.disconnectsTotal,
      },
      apiLatency: {
        count: metricsSnapshot.http.latencyMs.count,
        p50Ms: metricsSnapshot.http.latencyMs.p50Ms,
        p95Ms: metricsSnapshot.http.latencyMs.p95Ms,
        avgMs: metricsSnapshot.http.latencyMs.avgMs,
      },
      ram: {
        rssMb: metricsSnapshot.process.memoryRssMb,
        heapUsedMb: metricsSnapshot.process.memoryHeapUsedMb,
        heapTotalMb: metricsSnapshot.process.memoryHeapTotalMb,
      },
      cpu: {
        available: false,
        placeholderKey: "p8.admin.noc.cpu.waiting_host_metrics",
      },
    },
    queueCenter,
    recentActivity,
  };
}

export { OPEN_REPORT_STATUSES, OPEN_SUPPORT_STATUSES };
