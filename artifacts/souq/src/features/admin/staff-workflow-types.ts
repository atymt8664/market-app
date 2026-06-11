import { getAdminPresetI18nKeys, type AdminPresetContext } from "./admin-preset-keys";

export const MODERATION_REASON_PRESET_KEYS = getAdminPresetI18nKeys("ads");

export function moderationPresetKeysForContext(
  context: AdminPresetContext,
): readonly string[] {
  return getAdminPresetI18nKeys(context);
}

export type StaffAssignment = {
  staffId: number | null;
  staffName: string | null;
  roleKey: string | null;
  assignedAt: string | null;
  assignedByAdminId: number | null;
  assignedByName: string | null;
};
