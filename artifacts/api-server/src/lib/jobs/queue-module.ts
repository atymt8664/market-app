import { PgBoss } from "pg-boss";
import { DEFAULT_JOB_QUEUE_SCHEMA } from "./constants";
import { assertJobQueueAllowed } from "./env-guard";
import { ensureRegisteredQueues } from "./dlq";

export type JobQueueConfig = {
  connectionString: string;
  schema: string;
};

let bossInstance: PgBoss | null = null;
let startPromise: Promise<PgBoss> | null = null;

export function resolveJobQueueConfig(): JobQueueConfig {
  assertJobQueueAllowed();
  const connectionString = process.env["DATABASE_URL"]?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for pg-boss");
  }
  const schema =
    process.env["JOB_QUEUE_SCHEMA"]?.trim() || DEFAULT_JOB_QUEUE_SCHEMA;
  return { connectionString, schema };
}

export function createBossInstance(config?: JobQueueConfig): PgBoss {
  const resolved = config ?? resolveJobQueueConfig();
  return new PgBoss({
    connectionString: resolved.connectionString,
    schema: resolved.schema,
  });
}

/** Start pg-boss supervisor (schema migrate + queue seeds). */
export async function startQueueModule(existing?: PgBoss): Promise<PgBoss> {
  if (bossInstance) return bossInstance;
  if (startPromise) return startPromise;

  startPromise = (async () => {
    const boss = existing ?? createBossInstance();
    await boss.start();
    await ensureRegisteredQueues(boss);
    bossInstance = boss;
    return boss;
  })();

  try {
    return await startPromise;
  } catch (err) {
    startPromise = null;
    throw err;
  }
}

export function getQueueModuleOrNull(): PgBoss | null {
  return bossInstance;
}

export function getQueueModule(): PgBoss {
  if (!bossInstance) {
    throw new Error("Queue module not started — call startQueueModule() first");
  }
  return bossInstance;
}

/** Graceful shutdown with timeout (worker SIGTERM path). */
export async function stopQueueModule(options?: {
  graceful?: boolean;
  timeoutMs?: number;
}): Promise<void> {
  const boss = bossInstance;
  bossInstance = null;
  startPromise = null;
  if (!boss) return;

  const graceful = options?.graceful ?? true;
  const timeout = options?.timeoutMs ?? 30_000;
  await boss.stop({ graceful, timeout });
}
