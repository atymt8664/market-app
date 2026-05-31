/**
 * P8-1G — Monetization / billing / plans boundary markers (P10 owner for revenue).
 * Docs: docs/architecture/P08-billing-plans-boundary.md
 */

export type MonetizationBoundarySurface =
  | "admin.billing"
  | "admin.plans"
  | "admin.verification_ops"
  | "user.promote"
  | "user.promote_preview"
  | "user.pro_seller"
  | "user.payments"
  | "user.verification_preview"
  | "user.trust_score";

/** Surfaces that must carry `data-p10-preview` (or ops marker) in UI. */
export const MONETIZATION_BOUNDARY_SURFACES: MonetizationBoundarySurface[] = [
  "admin.billing",
  "admin.plans",
  "admin.verification_ops",
  "user.promote",
  "user.promote_preview",
  "user.pro_seller",
  "user.payments",
  "user.verification_preview",
  "user.trust_score",
];

export function p10PreviewAttrs(
  surface: MonetizationBoundarySurface,
): { "data-p10-preview": MonetizationBoundarySurface } {
  return { "data-p10-preview": surface };
}

/** Admin verification queue is live ops — distinct from user submit preview. */
export function p8VerificationOpsAttrs(): { "data-p8-verification-ops": "true" } {
  return { "data-p8-verification-ops": "true" };
}
