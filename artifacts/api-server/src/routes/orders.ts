import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../middlewares/require-auth";
import {
  getMockBuyerOrders,
  getMockOrderById,
  getMockOrderIssues,
  getMockOrdersStats,
  getMockOrderTimeline,
  getMockSellerOrders,
  isKnownMockOrderId,
} from "../lib/p17/orders-mock-data";
import {
  OrderDetailResponseSchema,
  OrderIdParamSchema,
  OrderIssuesResponseSchema,
  OrdersListResponseSchema,
  OrdersStatsSchema,
  OrderTimelineResponseSchema,
} from "../lib/p17/orders-schemas";
import {
  OrdersStatusSummarySchema,
  P17_ORDERS_STATUS_SUMMARY_MOCK,
} from "../lib/p17/orders-status-summary";

const router: IRouter = Router();

function parseOrderIdParam(req: Request, res: Response, next: NextFunction): void {
  const parsed = OrderIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "معرّف الطلب غير صالح" });
    return;
  }
  req.params.id = parsed.data.id;
  next();
}

/** P17-4A compat — zeros-only summary until stats migration on clients. */
router.get("/orders/status-summary", requireAuth, (_req, res) => {
  const payload = OrdersStatusSummarySchema.parse(P17_ORDERS_STATUS_SUMMARY_MOCK);
  res.json(payload);
});

router.get("/orders/stats", requireAuth, (_req, res) => {
  const payload = OrdersStatsSchema.parse(getMockOrdersStats());
  res.json(payload);
});

router.get("/orders/seller", requireAuth, (_req, res) => {
  const payload = OrdersListResponseSchema.parse({
    items: getMockSellerOrders(),
    total: getMockSellerOrders().length,
    mock: true as const,
  });
  res.json(payload);
});

router.get("/orders/:id/timeline", requireAuth, parseOrderIdParam, (req, res) => {
  const orderId = String(req.params.id);
  if (!isKnownMockOrderId(orderId)) {
    res.status(404).json({ error: "الطلب غير موجود" });
    return;
  }
  const payload = OrderTimelineResponseSchema.parse({
    orderId,
    items: getMockOrderTimeline(orderId),
    mock: true as const,
  });
  res.json(payload);
});

router.get("/orders/:id/issues", requireAuth, parseOrderIdParam, (req, res) => {
  const orderId = String(req.params.id);
  if (!isKnownMockOrderId(orderId)) {
    res.status(404).json({ error: "الطلب غير موجود" });
    return;
  }
  const payload = OrderIssuesResponseSchema.parse({
    orderId,
    items: getMockOrderIssues(orderId),
    mock: true as const,
  });
  res.json(payload);
});

router.get("/orders/:id", requireAuth, parseOrderIdParam, (req, res) => {
  const orderId = String(req.params.id);
  const order = getMockOrderById(orderId);
  if (!order) {
    res.status(404).json({ error: "الطلب غير موجود" });
    return;
  }
  const payload = OrderDetailResponseSchema.parse({
    order,
    mock: true as const,
  });
  res.json(payload);
});

router.get("/orders", requireAuth, (_req, res) => {
  const items = getMockBuyerOrders();
  const payload = OrdersListResponseSchema.parse({
    items,
    total: items.length,
    mock: true as const,
  });
  res.json(payload);
});

export default router;
