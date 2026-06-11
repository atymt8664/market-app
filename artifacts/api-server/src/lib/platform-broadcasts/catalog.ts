import type { BroadcastCategory } from "./types";
import { BROADCAST_CATEGORIES } from "./types";

const CATEGORY_TO_TYPE: Record<BroadcastCategory, string> = {
  platform_update: "announcement.platform.update",
  new_feature: "announcement.platform.feature",
  scheduled_maintenance: "announcement.platform.maintenance",
  security_alert: "announcement.platform.security",
  official_announcement: "announcement.platform.official",
};

export function isBroadcastCategory(value: string): value is BroadcastCategory {
  return (BROADCAST_CATEGORIES as readonly string[]).includes(value);
}

export function resolveBroadcastNotificationType(category: BroadcastCategory): string {
  return CATEGORY_TO_TYPE[category];
}

export function broadcastDedupKey(broadcastId: number, userId: number): string {
  return `broadcast:${broadcastId}:${userId}`;
}
