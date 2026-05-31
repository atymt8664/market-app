import type { Job } from "pg-boss";
import { STAGING_SUPABASE_REF } from "../constants";
import { detectSupabaseProjectRef } from "../env-guard";
import type {
  AuthOtpEmailPayload,
  AuthResetEmailPayload,
} from "../email-types";
import { incrementEmailJobMetric } from "../job-queue-metrics";
import { EMAIL_JOB_TYPES, registerJobHandler } from "../registry";
import type { JobEnvelope } from "../types";
import { logger } from "../../logger";
import {
  executeSendPasswordResetEmail,
  executeSendVerificationCodeEmail,
} from "../../email-send";

function parseEnvelope<T>(data: unknown): JobEnvelope<T> {
  if (!data || typeof data !== "object") {
    throw new Error("invalid job envelope");
  }
  const envelope = data as JobEnvelope<T>;
  if (envelope.v !== 1 || !envelope.payload) {
    throw new Error("unsupported job envelope version");
  }
  return envelope;
}

function isStagingDryRun(payload: { dryRun?: boolean }): boolean {
  return (
    payload.dryRun === true &&
    detectSupabaseProjectRef() === STAGING_SUPABASE_REF
  );
}

async function handleAuthOtp(jobs: Job[]): Promise<void> {
  for (const job of jobs) {
    const envelope = parseEnvelope<AuthOtpEmailPayload>(job.data);
    const { to, code } = envelope.payload;
    if (!to?.trim() || !code?.trim()) {
      throw new Error("auth.otp payload missing to or code");
    }
    if (isStagingDryRun(envelope.payload)) {
      logger.info(
        { jobId: job.id, jobName: job.name, kind: "auth_otp_dry_run" },
        "P15 email job dry run (STAGING smoke)",
      );
      incrementEmailJobMetric("processed");
      continue;
    }
    try {
      await executeSendVerificationCodeEmail(to, code);
      incrementEmailJobMetric("processed");
      logger.info(
        { jobId: job.id, jobName: job.name, kind: "auth_otp_sent" },
        "P15 email job processed: auth.otp",
      );
    } catch (err) {
      incrementEmailJobMetric("failed");
      throw err;
    }
  }
}

async function handleAuthReset(jobs: Job[]): Promise<void> {
  for (const job of jobs) {
    const envelope = parseEnvelope<AuthResetEmailPayload>(job.data);
    const { to, resetUrl } = envelope.payload;
    if (!to?.trim() || !resetUrl?.trim()) {
      throw new Error("auth.reset payload missing to or resetUrl");
    }
    if (isStagingDryRun(envelope.payload)) {
      logger.info(
        { jobId: job.id, jobName: job.name, kind: "auth_reset_dry_run" },
        "P15 email job dry run (STAGING smoke)",
      );
      incrementEmailJobMetric("processed");
      continue;
    }
    try {
      await executeSendPasswordResetEmail(to, resetUrl);
      incrementEmailJobMetric("processed");
      logger.info(
        { jobId: job.id, jobName: job.name, kind: "auth_reset_sent" },
        "P15 email job processed: auth.reset",
      );
    } catch (err) {
      incrementEmailJobMetric("failed");
      throw err;
    }
  }
}

/** Register P15-3 transactional email handlers. */
export function registerEmailJobHandlers(): void {
  registerJobHandler({
    name: EMAIL_JOB_TYPES.AUTH_OTP,
    handler: handleAuthOtp,
  });
  registerJobHandler({
    name: EMAIL_JOB_TYPES.AUTH_RESET,
    handler: handleAuthReset,
  });
}
