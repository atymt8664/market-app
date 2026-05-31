/** Media purge job payloads (P15-3G). */
export type MediaPurgePayload = {
  userId: number;
  paths: string[];
  trigger: "account_deletion" | "manual" | "smoke";
  dryRun?: boolean;
};

export type MediaPurgeResult = {
  userId: number;
  pathsRemoved: number;
};
