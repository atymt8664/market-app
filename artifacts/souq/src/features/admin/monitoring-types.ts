export type MonitoringSeverity = "ok" | "warning" | "critical";

export type MonitoringAlert = {
  id: string;
  auditActivityId: number | null;
  severity: "warning" | "critical";
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
  serverMetrics: {
    cpu: {
      cores: number;
      loadAvg1m: number | null;
      loadAvg5m: number | null;
      loadAvg15m: number | null;
      processCpuUserMicros: number;
      processCpuSystemMicros: number;
    };
    memory: {
      systemTotalMb: number;
      systemFreeMb: number;
      systemUsedPercent: number | null;
      processRssMb: number;
      processHeapUsedMb: number;
      processHeapTotalMb: number;
    };
    disk: {
      available: boolean;
      totalGb: number | null;
      freeGb: number | null;
      usedPercent: number | null;
    };
    network: {
      interfaceCount: number;
      activeInterfaceCount: number;
    };
    connections: {
      activeSocketConnections: number;
    };
    process: {
      pid: number;
      uptimeSeconds: number;
      nodeVersion: string;
    };
  };
  apiMetrics: {
    requestCount: number;
    errorRatePercent: number | null;
    slowRequestCount: number;
    latencyMs: {
      p50Ms: number | null;
      p95Ms: number | null;
      p99Ms: number | null;
    };
    slowEndpoints: Array<{
      route: string;
      count: number;
      latencyMs: {
        p50Ms: number | null;
        p95Ms: number | null;
        p99Ms: number | null;
      };
    }>;
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
    pool: {
      totalCount: number;
      idleCount: number;
      waitingCount: number;
      maxConnections: number;
      utilizationPercent: number | null;
    };
  };
  websocketMetrics: {
    onlineUsers: number;
    socketConnections: number;
    disconnectsTotal: number;
    window: {
      windowSeconds: number;
      connectsLastMinute: number;
      disconnectsLastMinute: number;
      connectsPreviousMinute: number;
      disconnectsPreviousMinute: number;
      disconnectSpike: boolean;
      reconnectSpike: boolean;
    };
  };
  queueMetrics: {
    push: {
      available: boolean;
      pending: number | null;
      active: number | null;
      processed: number | null;
      failed: number | null;
      retryCount: number | null;
    };
    queueWorkerDepth: number | null;
  };
  founder: {
    bottlenecks: Array<{ domain: string; unassigned: number; slaExceeded: number }>;
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
  sentry: {
    enabled: boolean;
    configured: boolean;
    environment: string;
    release: string | null;
  };
  alerts: MonitoringAlert[];
};

export type AdminMonitoringResponse = {
  status: string;
  title: string;
  description: string;
  nextStep: string;
  activityId: string;
  snapshot: AdminMonitoringSnapshot;
};
