export const MODERATION_REASON_PRESET_KEYS = [
  "p8.admin.moderation.preset.duplicate",
  "p8.admin.moderation.preset.inappropriate_images",
  "p8.admin.moderation.preset.misleading_info",
  "p8.admin.moderation.preset.violating_content",
  "p8.admin.moderation.preset.terms_violation",
  "p8.admin.moderation.preset.false_report",
  "p8.admin.moderation.preset.resolved",
] as const;

export type StaffAssignment = {
  staffId: number | null;
  staffName: string | null;
  roleKey: string | null;
  assignedAt: string | null;
  assignedByAdminId: number | null;
  assignedByName: string | null;
};
