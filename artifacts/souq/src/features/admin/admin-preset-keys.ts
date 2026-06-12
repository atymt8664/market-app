/** Mirrors api-server communications/admin-presets.ts i18n keys. */

export type AdminPresetContext = "reports" | "support" | "verification" | "ads" | "avatar";

const ADMIN_PRESET_I18N_KEYS: Record<AdminPresetContext, readonly string[]> = {
  reports: [
    "p8.admin.preset.reports.action_taken",
    "p8.admin.preset.reports.content_removed",
    "p8.admin.preset.reports.user_warned",
    "p8.admin.preset.reports.account_suspended",
    "p8.admin.preset.reports.no_violation",
    "p8.admin.preset.reports.report_closed",
  ],
  support: [
    "p8.admin.preset.support.issue_resolved",
    "p8.admin.preset.support.account_updated",
    "p8.admin.preset.support.access_restored",
    "p8.admin.preset.support.escalated",
    "p8.admin.preset.support.awaiting_info",
  ],
  verification: [
    "p8.admin.preset.verification.approved",
    "p8.admin.preset.verification.rejected",
    "p8.admin.preset.verification.needs_info",
    "p8.admin.preset.verification.resubmit_docs",
    "p8.admin.preset.verification.under_review",
  ],
  ads: [
    "p8.admin.moderation.preset.duplicate",
    "p8.admin.moderation.preset.inappropriate_images",
    "p8.admin.moderation.preset.misleading_info",
    "p8.admin.moderation.preset.violating_content",
    "p8.admin.moderation.preset.terms_violation",
  ],
  avatar: [
    "p8.admin.moderation.preset.inappropriate_images",
    "p8.admin.moderation.preset.violating_content",
    "p8.admin.moderation.preset.terms_violation",
  ],
};

export function getAdminPresetI18nKeys(context: AdminPresetContext): readonly string[] {
  return ADMIN_PRESET_I18N_KEYS[context];
}
