import crypto from "node:crypto";
import { logger } from "./logger";
import {
  executeSendPasswordResetEmail,
  executeSendVerificationCodeEmail,
} from "./email-send";
import {
  detectSupabaseProjectRef,
  isJobQueueEnabled,
} from "./jobs/env-guard";
import { STAGING_SUPABASE_REF } from "./jobs/constants";
import {
  enqueueAuthOtpEmail,
  enqueueAuthResetEmail,
} from "./jobs/enqueue";
import { startQueueModule } from "./jobs/queue-module";
import { incrementEmailJobMetric } from "./jobs/job-queue-metrics";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function isTrue(value: string | undefined): boolean {
  return value ? TRUE_VALUES.has(value.trim().toLowerCase()) : false;
}

/**
 * P15-3: email outbox active on STAGING when queue + outbox flags are set.
 * PRODUCTION and non-queue runtimes keep synchronous Resend (no behavior change).
 */
export function isEmailOutboxEnabled(): boolean {
  if (!isJobQueueEnabled()) return false;
  if (!isTrue(process.env["EMAIL_OUTBOX_ENABLED"] ?? "1")) return false;
  return detectSupabaseProjectRef() === STAGING_SUPABASE_REF;
}

function idempotencyHash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 24);
}

async function enqueueOrSyncVerification(
  email: string,
  code: string,
): Promise<void> {
  if (!isEmailOutboxEnabled()) {
    await executeSendVerificationCodeEmail(email, code);
    return;
  }

  const boss = await startQueueModule();
  const idempotencyKey = `auth.otp:${idempotencyHash(`${email.toLowerCase()}:${code}`)}`;
  const jobId = await enqueueAuthOtpEmail(
    boss,
    { to: email, code },
    { idempotencyKey },
  );
  if (!jobId) {
    throw new Error("Failed to enqueue auth.otp email job");
  }
  incrementEmailJobMetric("enqueued");
  logger.info(
    { kind: "email_outbox_enqueued", jobName: "auth.otp", jobId },
    "Verification email enqueued",
  );
}

async function enqueueOrSyncPasswordReset(
  email: string,
  resetUrl: string,
): Promise<void> {
  if (!isEmailOutboxEnabled()) {
    await executeSendPasswordResetEmail(email, resetUrl);
    return;
  }

  const boss = await startQueueModule();
  const idempotencyKey = `auth.reset:${idempotencyHash(`${email.toLowerCase()}:${resetUrl}`)}`;
  const jobId = await enqueueAuthResetEmail(
    boss,
    { to: email, resetUrl },
    { idempotencyKey },
  );
  if (!jobId) {
    throw new Error("Failed to enqueue auth.reset email job");
  }
  incrementEmailJobMetric("enqueued");
  logger.info(
    { kind: "email_outbox_enqueued", jobName: "auth.reset", jobId },
    "Password reset email enqueued",
  );
}

/** Auth hot path — STAGING outbox or sync Resend. */
export async function dispatchVerificationCodeEmail(
  email: string,
  code: string,
): Promise<void> {
  return enqueueOrSyncVerification(email, code);
}

/** Auth hot path — STAGING outbox or sync Resend. */
export async function dispatchPasswordResetEmail(
  email: string,
  resetUrl: string,
): Promise<void> {
  return enqueueOrSyncPasswordReset(email, resetUrl);
}
