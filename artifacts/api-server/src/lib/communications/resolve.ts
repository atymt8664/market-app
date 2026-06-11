import type { OfficialCommunicationOptions } from "./types";
import { applySlaWindow, formatSlaWindow, resolveSlaProfileForNotificationType } from "./sla-window";
import { hasOfficialTemplate, OFFICIAL_TEMPLATES } from "./templates";

export function resolveOfficialCommunication(
  options: OfficialCommunicationOptions & {
    slaWindow?: string | null;
    slaContext?: Parameters<typeof resolveSlaProfileForNotificationType>[1];
  },
): { title: string; body: string } | null {
  const type = options.type.trim().toLowerCase().slice(0, 80);
  const template = OFFICIAL_TEMPLATES[type];
  if (!template) return null;

  let slaWindow = options.slaWindow ?? null;
  if (!slaWindow && template.body.includes("{{sla_window}}")) {
    const profile = options.slaProfile ?? resolveSlaProfileForNotificationType(type, options.slaContext);
    if (profile) slaWindow = formatSlaWindow(profile);
  }

  return {
    title: template.title.trim().slice(0, 500),
    body: applySlaWindow(template.body, slaWindow).trim().slice(0, 2000),
  };
}

/** Returns official copy or null — callers keep inline fallback for unresolved types. */
export function officialNotificationContent(
  options: OfficialCommunicationOptions & {
    slaContext?: Parameters<typeof resolveSlaProfileForNotificationType>[1];
  },
): { title: string; body: string } | null {
  return resolveOfficialCommunication(options);
}

export function officialAdminNotificationContent(
  type: string,
): { title: string; body: string } | null {
  return resolveOfficialCommunication({ type });
}
