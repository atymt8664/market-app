import type { PgBoss } from "pg-boss";
import { registerFoundationJobHandlers } from "./handlers/foundation";
import { registerEmailJobHandlers } from "./handlers/email";
import { registerNotificationJobHandlers } from "./handlers/notification";
import {
  listRegisteredJobHandlers,
  REGISTERED_JOB_NAMES,
} from "./registry";
import {
  getQueueModule,
  startQueueModule,
  stopQueueModule,
} from "./queue-module";
import { assertJobQueueAllowed } from "./env-guard";
import { logger } from "../logger";

export type JobWorkerRuntime = {
  boss: PgBoss;
  workIds: string[];
  shutdown: () => Promise<void>;
};

let shuttingDown = false;

async function attachHandlers(boss: PgBoss): Promise<string[]> {
  const workIds: string[] = [];
  for (const { name, handler } of listRegisteredJobHandlers()) {
    const workId = await boss.work(name, handler);
    workIds.push(workId);
    logger.info({ jobName: name, workId }, "P15 job handler attached");
  }
  return workIds;
}

async function detachHandlers(boss: PgBoss): Promise<void> {
  for (const name of REGISTERED_JOB_NAMES) {
    try {
      await boss.offWork(name);
    } catch (err) {
      logger.warn({ err, jobName: name }, "offWork during shutdown");
    }
  }
}

/**
 * Bootstrap pg-boss worker (P15-2 foundation + P15-3A email + P15-3B notifications).
 */
export async function bootstrapJobWorker(): Promise<JobWorkerRuntime> {
  assertJobQueueAllowed();
  registerFoundationJobHandlers();
  registerEmailJobHandlers();
  registerNotificationJobHandlers();

  const boss = await startQueueModule();
  const workIds = await attachHandlers(boss);

  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info("P15 job worker shutting down gracefully");
    await detachHandlers(boss);
    await stopQueueModule({ graceful: true, timeoutMs: 30_000 });
    logger.info("P15 job worker stopped");
  };

  const onSignal = () => {
    void shutdown().finally(() => process.exit(0));
  };
  process.once("SIGTERM", onSignal);
  process.once("SIGINT", onSignal);

  logger.info(
    {
      handlerCount: listRegisteredJobHandlers().length,
      workIds,
      schemaVersion: await boss.schemaVersion(),
    },
    "P15 job worker ready",
  );

  return { boss, workIds, shutdown };
}

/** Producer-only bootstrap (smoke scripts) — starts queue without workers. */
export async function bootstrapQueueProducer(): Promise<PgBoss> {
  assertJobQueueAllowed();
  return startQueueModule();
}

export async function shutdownQueueProducer(): Promise<void> {
  await stopQueueModule({ graceful: true, timeoutMs: 15_000 });
}

export function getActiveBoss(): PgBoss {
  return getQueueModule();
}
