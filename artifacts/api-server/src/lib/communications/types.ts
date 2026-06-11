import type { SlaProfile } from "../admin-operations-sla";

export type OfficialTemplate = {
  title: string;
  body: string;
};

export type OfficialCommunicationOptions = {
  type: string;
  slaProfile?: SlaProfile | null;
};

export type AdminPresetContext = "reports" | "support" | "verification" | "ads" | "avatar";
