import type { Job } from "pg-boss";

/** Foundation job names only — business jobs added in P15-3+. */
export const FOUNDATION_JOB_TYPES = {
  SYSTEM_PING: "system.ping",
  SYSTEM_DLQ_PROBE: "system.dlq_probe",
} as const;

export type FoundationJobType =
  (typeof FOUNDATION_JOB_TYPES)[keyof typeof FOUNDATION_JOB_TYPES];

/** All job names registered in P15-2 (extend in P15-3). */
export const REGISTERED_JOB_NAMES = [
  FOUNDATION_JOB_TYPES.SYSTEM_PING,
  FOUNDATION_JOB_TYPES.SYSTEM_DLQ_PROBE,
] as const;

export type RegisteredJobName = (typeof REGISTERED_JOB_NAMES)[number];

export type JobHandlerFn = (jobs: Job[]) => Promise<void>;

export type JobHandlerRegistration = {
  name: RegisteredJobName;
  handler: JobHandlerFn;
};

const handlers = new Map<RegisteredJobName, JobHandlerFn>();

export function registerJobHandler(registration: JobHandlerRegistration): void {
  if (handlers.has(registration.name)) {
    throw new Error(`Duplicate job handler registration: ${registration.name}`);
  }
  handlers.set(registration.name, registration.handler);
}

export function getJobHandler(name: RegisteredJobName): JobHandlerFn | undefined {
  return handlers.get(name);
}

export function listRegisteredJobHandlers(): JobHandlerRegistration[] {
  return REGISTERED_JOB_NAMES.filter((name) => handlers.has(name)).map((name) => ({
    name,
    handler: handlers.get(name)!,
  }));
}

export function clearJobHandlerRegistryForTests(): void {
  handlers.clear();
}

export function registeredJobHandlerCount(): number {
  return handlers.size;
}
