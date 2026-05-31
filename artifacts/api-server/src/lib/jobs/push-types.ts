import type { PushDeliveryJob } from "../push/push-queue";

/** pg-boss payload for push.deliver (P15-3C). */
export type PushDeliverJobPayload = PushDeliveryJob & {
  /** STAGING smoke only — skips delivery when true. */
  dryRun?: boolean;
};
