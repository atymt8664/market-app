export type OpsDomain = "verification" | "reports" | "support" | "ads";

export type OpsQueueKey =
  | "all"
  | "unassigned"
  | "mine"
  | "urgent"
  | "escalation"
  | "sla_exceeded"
  | "sla_within"
  | "sla_approaching";

export type DomainQueueCountsView = {
  domain?: OpsDomain;
  total: number;
  unassigned: number;
  mine: number;
  urgent: number;
  escalation: number;
  slaExceeded: number;
  slaWithin: number;
  slaApproaching: number;
};

export const OPS_QUEUE_TABS: Array<{
  key: OpsQueueKey;
  labelKey: string;
  countKey: keyof DomainQueueCountsView;
}> = [
  { key: "all", labelKey: "p8.admin.workflow.tab.all", countKey: "total" },
  { key: "unassigned", labelKey: "p8.admin.workflow.tab.unassigned", countKey: "unassigned" },
  { key: "mine", labelKey: "p8.admin.workflow.tab.mine", countKey: "mine" },
  { key: "urgent", labelKey: "p8.admin.workflow.tab.urgent", countKey: "urgent" },
  { key: "escalation", labelKey: "p8.admin.workflow.tab.escalation", countKey: "escalation" },
  { key: "sla_exceeded", labelKey: "p8.admin.workflow.tab.sla_exceeded", countKey: "slaExceeded" },
  { key: "sla_within", labelKey: "p8.admin.workflow.tab.sla_within", countKey: "slaWithin" },
  { key: "sla_approaching", labelKey: "p8.admin.workflow.tab.sla_approaching", countKey: "slaApproaching" },
];

export type OpsQueueSummaryView = {
  domains: DomainQueueCountsView[];
  totals: DomainQueueCountsView;
  generatedAt: string;
};

export type StaffLoadEntryView = {
  adminActorId: number;
  displayName: string;
  roleKey: string;
  sessionStatus: string;
  openTotal: number;
  verification: number;
  reports: number;
  support: number;
  ads: number;
  slaExceeded: number;
  claimLimit: number;
  loadPercent: number;
  isOverloaded: boolean;
};

export type FounderOperationsView = {
  summary: OpsQueueSummaryView;
  staffLoad: {
    staff: StaffLoadEntryView[];
    bottlenecks: Array<{ domain: OpsDomain; unassigned: number; slaExceeded: number }>;
    generatedAt: string;
  };
  lateStaff: StaffLoadEntryView[];
  health: {
    totalOpen: number;
    totalSlaExceeded: number;
    totalEscalation: number;
    totalUnassigned: number;
    overloadedStaff: number;
  };
  generatedAt: string;
};

export type SlaState = "within" | "approaching" | "exceeded";

export function slaStateClass(state: SlaState): string {
  if (state === "exceeded") return "border-red-500/45 bg-red-500/15 text-red-200";
  if (state === "approaching") return "border-amber-500/45 bg-amber-500/15 text-amber-200";
  return "border-emerald-500/45 bg-emerald-500/15 text-emerald-200";
}
