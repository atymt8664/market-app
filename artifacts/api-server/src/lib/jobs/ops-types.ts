import type { OpsDomain } from "../admin-operations-sla";

/** Scheduled SLA auto-escalation job payload (P15-3E). */
export type OpsSlaEscalatePayload = {
  trigger: "cron" | "manual" | "smoke";
  dryRun?: boolean;
};

export type OpsSlaEscalateResult = Record<OpsDomain, number>;
