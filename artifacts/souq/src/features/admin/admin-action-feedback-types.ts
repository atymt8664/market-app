export type AdminActionFeedback = {
  status?: "ok";
  title?: string;
  description?: string;
  nextStep?: string;
  auditActivityId?: number | null;
};
