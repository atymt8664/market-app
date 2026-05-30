import { z } from "zod";

/** P17-4A — static mock only; no DB reads/writes until P17-4+. */
export const OrdersStatusSummarySchema = z
  .object({
    new: z.number().int().min(0),
    confirming: z.number().int().min(0),
    preparing: z.number().int().min(0),
    shipping: z.number().int().min(0),
    completed: z.number().int().min(0),
    issues: z.number().int().min(0),
  })
  .strict();

export type OrdersStatusSummary = z.infer<typeof OrdersStatusSummarySchema>;

export const P17_ORDERS_STATUS_SUMMARY_MOCK: OrdersStatusSummary = {
  new: 0,
  confirming: 0,
  preparing: 0,
  shipping: 0,
  completed: 0,
  issues: 0,
};
