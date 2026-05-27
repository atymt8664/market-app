export type AdminActionFeedback = {
  status: "ok";
  title: string;
  description: string;
  nextStep: string;
  auditActivityId: number | null;
};

export function okAdminActionFeedback(params: {
  title: string;
  description: string;
  nextStep: string;
  auditActivityId?: number | null;
}): AdminActionFeedback {
  return {
    status: "ok",
    title: params.title,
    description: params.description,
    nextStep: params.nextStep,
    auditActivityId: params.auditActivityId ?? null,
  };
}
