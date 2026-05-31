import type { Job } from "pg-boss";

/** Foundation job names (P15-2). */
export const FOUNDATION_JOB_TYPES = {
  SYSTEM_PING: "system.ping",
  SYSTEM_DLQ_PROBE: "system.dlq_probe",
} as const;

/** Transactional email jobs (P15-3A). */
export const EMAIL_JOB_TYPES = {
  AUTH_OTP: "auth.otp",
  AUTH_RESET: "auth.reset",
} as const;

/** In-app notification jobs (P15-3B). */
export const NOTIFICATION_JOB_TYPES = {
  IN_APP: "notify.in_app",
} as const;

/** Web push delivery jobs (P15-3C — pg-boss layer; legacy Redis LIST unchanged). */
export const PUSH_JOB_TYPES = {
  DELIVER: "push.deliver",
} as const;

export type FoundationJobType =
  (typeof FOUNDATION_JOB_TYPES)[keyof typeof FOUNDATION_JOB_TYPES];

export type EmailJobType = (typeof EMAIL_JOB_TYPES)[keyof typeof EMAIL_JOB_TYPES];

export type NotificationJobType =
  (typeof NOTIFICATION_JOB_TYPES)[keyof typeof NOTIFICATION_JOB_TYPES];

export type PushJobType = (typeof PUSH_JOB_TYPES)[keyof typeof PUSH_JOB_TYPES];

/** All job names registered in the worker. */
export const REGISTERED_JOB_NAMES = [
  FOUNDATION_JOB_TYPES.SYSTEM_PING,
  FOUNDATION_JOB_TYPES.SYSTEM_DLQ_PROBE,
  EMAIL_JOB_TYPES.AUTH_OTP,
  EMAIL_JOB_TYPES.AUTH_RESET,
  NOTIFICATION_JOB_TYPES.IN_APP,
  PUSH_JOB_TYPES.DELIVER,
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
