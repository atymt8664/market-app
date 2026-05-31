export {
  STAGING_SUPABASE_REF,
  PRODUCTION_SUPABASE_REF,
  DEFAULT_JOB_QUEUE_SCHEMA,
  JOB_ENVELOPE_VERSION,
} from "./constants";
export {
  isJobQueueEnabled,
  detectSupabaseProjectRef,
  assertJobQueueAllowed,
  assertJobQueueStagingOnly,
} from "./env-guard";
export {
  STANDARD_RETRY_OPTIONS,
  DLQ_PROBE_RETRY_OPTIONS,
  sendOptionsForPriority,
  type JobPriority,
} from "./retry-policy";
export {
  FOUNDATION_JOB_TYPES,
  EMAIL_JOB_TYPES,
  NOTIFICATION_JOB_TYPES,
  REGISTERED_JOB_NAMES,
  registerJobHandler,
  listRegisteredJobHandlers,
  registeredJobHandlerCount,
  type RegisteredJobName,
} from "./registry";
export {
  DLQ_QUEUE_NAME,
  ensureRegisteredQueues,
  ensureFoundationQueues,
  listFailedJobs,
  listDeadLetterJobs,
  listRegisteredQueueNames,
} from "./dlq";
export {
  createBossInstance,
  startQueueModule,
  stopQueueModule,
  getQueueModule,
  getQueueModuleOrNull,
  resolveJobQueueConfig,
} from "./queue-module";
export {
  enqueueJob,
  enqueueFoundationPing,
  enqueueDlqProbe,
  enqueueAuthOtpEmail,
  enqueueAuthResetEmail,
  enqueueInAppNotification,
} from "./enqueue";
export {
  collectQueueHealthSnapshot,
  summarizeQueueDepth,
} from "./observability";
export {
  incrementEmailJobMetric,
  readEmailJobMetrics,
  incrementNotificationJobMetric,
  readNotificationJobMetrics,
  resetJobMetricsForTests,
} from "./job-queue-metrics";
export {
  bootstrapJobWorker,
  bootstrapQueueProducer,
  shutdownQueueProducer,
  type JobWorkerRuntime,
} from "./worker-bootstrap";
export { registerFoundationJobHandlers } from "./handlers/foundation";
export { registerEmailJobHandlers } from "./handlers/email";
export { registerNotificationJobHandlers } from "./handlers/notification";
export type {
  AuthOtpEmailPayload,
  AuthResetEmailPayload,
  EmailJobPayload,
} from "./email-types";
export type {
  CreateNotificationInput,
  PreparedInAppNotification,
  InAppNotificationJobPayload,
} from "./notification-types";
export type { JobEnvelope, EnqueueJobOptions, QueueHealthSnapshot } from "./types";
