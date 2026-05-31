import { PUSH_DELIVERY_QUEUE_KEY, getPushRedisClient, isPushQueueAvailable } from "./push/push-queue";
import { isPushConfigured } from "./push/vapid-config";
import { isJobQueueEnabled } from "./jobs/env-guard";
import { probePgBossJobQueue } from "./jobs/job-queue-probe";

export type InfrastructureComponentStatus = "ok" | "degraded" | "fail" | "unconfigured";

export type InfrastructureHealthSnapshot = {
  redis: {
    status: InfrastructureComponentStatus;
    latencyMs: number | null;
    queueDepth: number | null;
  };
  storage: {
    status: InfrastructureComponentStatus;
    latencyMs: number | null;
  };
  pushWorker: {
    status: InfrastructureComponentStatus;
    configured: boolean;
    queueDepth: number | null;
  };
  queueWorker: {
    status: InfrastructureComponentStatus;
    queueDepth: number | null;
    activeCount: number | null;
    dlqDepth: number | null;
    schemaVersion: number | null;
    configured: boolean;
  };
};

function storageConfigured(): boolean {
  const url = (process.env["SUPABASE_URL"] || "").trim();
  const key = (process.env["SUPABASE_SERVICE_ROLE_KEY"] || "").trim();
  return Boolean(url && key);
}

async function probeStorage(): Promise<{ status: InfrastructureComponentStatus; latencyMs: number | null }> {
  if (!storageConfigured()) {
    return { status: "unconfigured", latencyMs: null };
  }

  const rawUrl = (process.env["SUPABASE_URL"] || "").trim();
  const serviceRoleKey = (process.env["SUPABASE_SERVICE_ROLE_KEY"] || "").trim();
  const started = performance.now();

  try {
    const normalized = rawUrl.replace(/\/+$/, "");
    const res = await fetch(`${normalized}/storage/v1/bucket`, {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      signal: AbortSignal.timeout(4000),
    });
    const latencyMs = Math.round(performance.now() - started);
    if (res.ok) return { status: "ok", latencyMs };
    if (res.status >= 500) return { status: "fail", latencyMs };
    return { status: "degraded", latencyMs };
  } catch {
    return { status: "fail", latencyMs: Math.round(performance.now() - started) };
  }
}

async function probeRedis(): Promise<{
  status: InfrastructureComponentStatus;
  latencyMs: number | null;
  queueDepth: number | null;
}> {
  if (!isPushQueueAvailable()) {
    return { status: "unconfigured", latencyMs: null, queueDepth: null };
  }

  const started = performance.now();
  try {
    const client = await getPushRedisClient();
    if (!client?.isOpen) {
      return { status: "fail", latencyMs: Math.round(performance.now() - started), queueDepth: null };
    }
    await client.ping();
    const latencyMs = Math.round(performance.now() - started);
    let queueDepth: number | null = null;
    try {
      queueDepth = await client.lLen(PUSH_DELIVERY_QUEUE_KEY);
    } catch {
      queueDepth = null;
    }
    return { status: "ok", latencyMs, queueDepth };
  } catch {
    return { status: "fail", latencyMs: Math.round(performance.now() - started), queueDepth: null };
  }
}

export async function buildInfrastructureHealthSnapshot(): Promise<InfrastructureHealthSnapshot> {
  const [redis, storage, pgBoss] = await Promise.all([
    probeRedis(),
    probeStorage(),
    probePgBossJobQueue(),
  ]);

  const pushConfigured = isPushConfigured() && isPushQueueAvailable();
  let pushWorkerStatus: InfrastructureComponentStatus = "unconfigured";
  if (pushConfigured) {
    if (redis.status === "ok") pushWorkerStatus = "ok";
    else if (redis.status === "unconfigured") pushWorkerStatus = "unconfigured";
    else pushWorkerStatus = "fail";
  }

  let queueWorkerStatus: InfrastructureComponentStatus = "unconfigured";
  if (isJobQueueEnabled()) {
    queueWorkerStatus = pgBoss.status;
  }

  return {
    redis: {
      status: redis.status,
      latencyMs: redis.latencyMs,
      queueDepth: redis.queueDepth,
    },
    storage: {
      status: storage.status,
      latencyMs: storage.latencyMs,
    },
    pushWorker: {
      status: pushWorkerStatus,
      configured: pushConfigured,
      queueDepth: redis.queueDepth,
    },
    queueWorker: {
      status: queueWorkerStatus,
      queueDepth: pgBoss.queueDepth,
      activeCount: pgBoss.activeCount,
      dlqDepth: pgBoss.dlqDepth,
      schemaVersion: pgBoss.schemaVersion,
      configured: pgBoss.configured,
    },
  };
}
