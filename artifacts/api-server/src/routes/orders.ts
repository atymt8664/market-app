import {
  Router,
  type IRouter,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { requireAuth } from "../middlewares/require-auth";
import { requireUserCsrf } from "../middlewares/require-user-csrf";
import { isOrdersApiError } from "../lib/p17/orders-api-errors";
import { mockOrdersProvider } from "../lib/p17/orders-mock-provider";
import {
  CreateOrderBodySchema,
  ordersService,
  parseOrderReferenceParam,
} from "../lib/p17/orders-service";
import { MarkShippedBodySchema } from "../lib/p17/orders-schemas";
import { useP17OrdersDatabaseProvider } from "../lib/p17/orders-env-guard";
import {
  CreateOrderResponseSchema,
  OrderActionResponseSchema,
  OrderDetailResponseSchema,
  OrderIssuesResponseSchema,
  OrderReferenceParamSchema,
  OrdersListResponseSchema,
  OrdersStatsSchema,
  OrderTimelineResponseSchema,
} from "../lib/p17/orders-schemas";
import {
  OrdersStatusSummarySchema,
  P17_ORDERS_STATUS_SUMMARY_MOCK,
} from "../lib/p17/orders-status-summary";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function isDbProvider(): boolean {
  return useP17OrdersDatabaseProvider();
}

function parseOrderRefParam(req: Request, res: Response, next: NextFunction): void {
  const parsed = OrderReferenceParamSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "معرّف الطلب غير صالح", code: "ORDER_VALIDATION" });
    return;
  }
  req.params.id = parsed.data.id;
  next();
}

function handleOrdersError(error: unknown, res: Response): void {
  if (isOrdersApiError(error)) {
    res.status(error.status).json({ error: error.message, code: error.code });
    return;
  }
  logger.error({ err: error }, "orders_route_error");
  res.status(500).json({ error: "حدث خطأ غير متوقع" });
}

function readIdempotencyKey(req: Request): string | undefined {
  const header = req.header("Idempotency-Key") ?? req.header("idempotency-key");
  return header?.trim() || undefined;
}

/** P17-4A compat — zeros-only summary until stats migration on clients. */
router.get("/orders/status-summary", requireAuth, (_req, res) => {
  const payload = OrdersStatusSummarySchema.parse(P17_ORDERS_STATUS_SUMMARY_MOCK);
  res.json(payload);
});

router.get("/orders/stats", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    if (!isDbProvider()) {
      const payload = OrdersStatsSchema.parse(getMockOrdersStatsFromProvider());
      res.json(payload);
      return;
    }
    const buyerStats = await ordersService.getBuyerStats(userId);
    const payload = OrdersStatsSchema.parse({ ...buyerStats, mock: false });
    res.json(payload);
  } catch (error) {
    handleOrdersError(error, res);
  }
});

router.get("/orders/seller", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    if (!isDbProvider()) {
      const items = mockOrdersProvider.listSellerOrders();
      const payload = OrdersListResponseSchema.parse({
        items,
        total: items.length,
        mock: true,
      });
      res.json(payload);
      return;
    }
    const { items, total } = await ordersService.listSellerOrders(userId);
    const payload = OrdersListResponseSchema.parse({ items, total, mock: false });
    res.json(payload);
  } catch (error) {
    handleOrdersError(error, res);
  }
});

router.get("/orders", requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;
    if (!isDbProvider()) {
      const items = mockOrdersProvider.listBuyerOrders();
      const payload = OrdersListResponseSchema.parse({
        items,
        total: items.length,
        mock: true,
      });
      res.json(payload);
      return;
    }
    const { items, total } = await ordersService.listBuyerOrders(userId);
    const payload = OrdersListResponseSchema.parse({ items, total, mock: false });
    res.json(payload);
  } catch (error) {
    handleOrdersError(error, res);
  }
});

router.post("/orders", requireAuth, requireUserCsrf, async (req, res) => {
  try {
    if (!isDbProvider()) {
      res.status(503).json({
        error: "إنشاء الطلبات غير متاح — طبقة الطلبات على STAGING فقط",
        code: "ORDER_API_DISABLED",
      });
      return;
    }
    const parsedBody = CreateOrderBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({ error: "بيانات الطلب غير صالحة", code: "ORDER_VALIDATION" });
      return;
    }
    const userId = req.session.userId!;
    const order = await ordersService.createOrder(
      userId,
      parsedBody.data,
      readIdempotencyKey(req),
    );
    const payload = CreateOrderResponseSchema.parse({ order, mock: false });
    res.status(201).json(payload);
  } catch (error) {
    handleOrdersError(error, res);
  }
});

router.get("/orders/:id/timeline", requireAuth, parseOrderRefParam, async (req, res) => {
  try {
    const orderRef = String(req.params.id);
    const userId = req.session.userId!;
    if (!isDbProvider()) {
      const items = mockOrdersProvider.getTimeline(orderRef);
      if (!items) {
        res.status(404).json({ error: "الطلب غير موجود", code: "ORDER_NOT_FOUND" });
        return;
      }
      const payload = OrderTimelineResponseSchema.parse({
        orderId: orderRef,
        items,
        mock: true,
      });
      res.json(payload);
      return;
    }
    parseOrderReferenceParam(orderRef);
    const items = await ordersService.getTimeline(userId, orderRef);
    const payload = OrderTimelineResponseSchema.parse({
      orderId: orderRef,
      items,
      mock: false,
    });
    res.json(payload);
  } catch (error) {
    handleOrdersError(error, res);
  }
});

router.get("/orders/:id/issues", requireAuth, parseOrderRefParam, async (req, res) => {
  try {
    const orderRef = String(req.params.id);
    const userId = req.session.userId!;
    if (!isDbProvider()) {
      const items = mockOrdersProvider.getIssues(orderRef);
      if (!items) {
        res.status(404).json({ error: "الطلب غير موجود", code: "ORDER_NOT_FOUND" });
        return;
      }
      const payload = OrderIssuesResponseSchema.parse({
        orderId: orderRef,
        items,
        mock: true,
      });
      res.json(payload);
      return;
    }
    parseOrderReferenceParam(orderRef);
    const items = await ordersService.getIssues(userId, orderRef);
    const payload = OrderIssuesResponseSchema.parse({
      orderId: orderRef,
      items,
      mock: false,
    });
    res.json(payload);
  } catch (error) {
    handleOrdersError(error, res);
  }
});

router.get("/orders/:id", requireAuth, parseOrderRefParam, async (req, res) => {
  try {
    const orderRef = String(req.params.id);
    const userId = req.session.userId!;
    if (!isDbProvider()) {
      const order = mockOrdersProvider.getOrderDetail(orderRef);
      if (!order) {
        res.status(404).json({ error: "الطلب غير موجود", code: "ORDER_NOT_FOUND" });
        return;
      }
      const payload = OrderDetailResponseSchema.parse({ order, mock: true });
      res.json(payload);
      return;
    }
    parseOrderReferenceParam(orderRef);
    const result = await ordersService.getOrderDetailForUser(userId, orderRef);
    if (!result) {
      res.status(404).json({ error: "الطلب غير موجود", code: "ORDER_NOT_FOUND" });
      return;
    }
    const payload = OrderDetailResponseSchema.parse({ order: result.order, mock: false });
    res.json(payload);
  } catch (error) {
    handleOrdersError(error, res);
  }
});

router.post(
  "/orders/:id/accept",
  requireAuth,
  requireUserCsrf,
  parseOrderRefParam,
  async (req, res) => {
    try {
      if (!isDbProvider()) {
        res.status(503).json({ error: "الإجراء غير متاح", code: "ORDER_API_DISABLED" });
        return;
      }
      const userId = req.session.userId!;
      const orderRef = parseOrderReferenceParam(String(req.params.id));
      const order = await ordersService.acceptOrder(userId, orderRef);
      const payload = OrderActionResponseSchema.parse({ order, mock: false });
      res.json(payload);
    } catch (error) {
      handleOrdersError(error, res);
    }
  },
);

router.post(
  "/orders/:id/reject",
  requireAuth,
  requireUserCsrf,
  parseOrderRefParam,
  async (req, res) => {
    try {
      if (!isDbProvider()) {
        res.status(503).json({ error: "الإجراء غير متاح", code: "ORDER_API_DISABLED" });
        return;
      }
      const userId = req.session.userId!;
      const orderRef = parseOrderReferenceParam(String(req.params.id));
      const order = await ordersService.rejectOrder(userId, orderRef);
      const payload = OrderActionResponseSchema.parse({ order, mock: false });
      res.json(payload);
    } catch (error) {
      handleOrdersError(error, res);
    }
  },
);

router.post(
  "/orders/:id/start-preparing",
  requireAuth,
  requireUserCsrf,
  parseOrderRefParam,
  async (req, res) => {
    try {
      if (!isDbProvider()) {
        res.status(503).json({ error: "الإجراء غير متاح", code: "ORDER_API_DISABLED" });
        return;
      }
      const userId = req.session.userId!;
      const orderRef = parseOrderReferenceParam(String(req.params.id));
      const order = await ordersService.startPreparing(userId, orderRef);
      const payload = OrderActionResponseSchema.parse({ order, mock: false });
      res.json(payload);
    } catch (error) {
      handleOrdersError(error, res);
    }
  },
);

router.post(
  "/orders/:id/mark-shipped",
  requireAuth,
  requireUserCsrf,
  parseOrderRefParam,
  async (req, res) => {
    try {
      if (!isDbProvider()) {
        res.status(503).json({ error: "الإجراء غير متاح", code: "ORDER_API_DISABLED" });
        return;
      }
      const parsed = MarkShippedBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "بيانات الشحن غير صالحة", code: "ORDER_VALIDATION" });
        return;
      }
      const userId = req.session.userId!;
      const orderRef = parseOrderReferenceParam(String(req.params.id));
      const order = await ordersService.markShipped(userId, orderRef, parsed.data);
      const payload = OrderActionResponseSchema.parse({ order, mock: false });
      res.json(payload);
    } catch (error) {
      handleOrdersError(error, res);
    }
  },
);

router.post(
  "/orders/:id/mark-in-transit",
  requireAuth,
  requireUserCsrf,
  parseOrderRefParam,
  async (req, res) => {
    try {
      if (!isDbProvider()) {
        res.status(503).json({ error: "الإجراء غير متاح", code: "ORDER_API_DISABLED" });
        return;
      }
      const userId = req.session.userId!;
      const orderRef = parseOrderReferenceParam(String(req.params.id));
      const order = await ordersService.markInTransit(userId, orderRef);
      const payload = OrderActionResponseSchema.parse({ order, mock: false });
      res.json(payload);
    } catch (error) {
      handleOrdersError(error, res);
    }
  },
);

router.post(
  "/orders/:id/mark-delivered",
  requireAuth,
  requireUserCsrf,
  parseOrderRefParam,
  async (req, res) => {
    try {
      if (!isDbProvider()) {
        res.status(503).json({ error: "الإجراء غير متاح", code: "ORDER_API_DISABLED" });
        return;
      }
      const userId = req.session.userId!;
      const orderRef = parseOrderReferenceParam(String(req.params.id));
      const order = await ordersService.markDelivered(userId, orderRef);
      const payload = OrderActionResponseSchema.parse({ order, mock: false });
      res.json(payload);
    } catch (error) {
      handleOrdersError(error, res);
    }
  },
);

router.post(
  "/orders/:id/confirm-receipt",
  requireAuth,
  requireUserCsrf,
  parseOrderRefParam,
  async (req, res) => {
    try {
      if (!isDbProvider()) {
        res.status(503).json({ error: "الإجراء غير متاح", code: "ORDER_API_DISABLED" });
        return;
      }
      const userId = req.session.userId!;
      const orderRef = parseOrderReferenceParam(String(req.params.id));
      const order = await ordersService.confirmReceipt(userId, orderRef);
      const payload = OrderActionResponseSchema.parse({ order, mock: false });
      res.json(payload);
    } catch (error) {
      handleOrdersError(error, res);
    }
  },
);

router.post(
  "/orders/:id/cancel",
  requireAuth,
  requireUserCsrf,
  parseOrderRefParam,
  async (req, res) => {
    try {
      if (!isDbProvider()) {
        res.status(503).json({ error: "الإجراء غير متاح", code: "ORDER_API_DISABLED" });
        return;
      }
      const userId = req.session.userId!;
      const orderRef = parseOrderReferenceParam(String(req.params.id));
      const order = await ordersService.cancelOrder(userId, orderRef);
      const payload = OrderActionResponseSchema.parse({ order, mock: false });
      res.json(payload);
    } catch (error) {
      handleOrdersError(error, res);
    }
  },
);

function getMockOrdersStatsFromProvider() {
  return mockOrdersProvider.getStats();
}

export default router;
