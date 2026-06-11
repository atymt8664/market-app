import type { CreateNotificationInput } from "../jobs/notification-types";
import type { CreateAdminNotificationInput } from "./types";
import { upsertAdminNotification } from "./persist";

/**
 * P17-9-7 — dual fan-out contract (admin now · user in P17-9-8+).
 * Trust/verification/moderation actions can call this without coupling tables.
 */
export type DualNotificationFanoutInput = {
  admin: CreateAdminNotificationInput;
  /** Reserved for P17-9-8 Verification / T&S user notifications — not executed here. */
  user?: CreateNotificationInput;
};

export async function fanoutAdminNotification(
  input: DualNotificationFanoutInput,
): Promise<{ adminNotificationId: number | null; userQueued: boolean }> {
  const adminNotificationId = await upsertAdminNotification(input.admin);
  return {
    adminNotificationId,
    userQueued: Boolean(input.user),
  };
}
