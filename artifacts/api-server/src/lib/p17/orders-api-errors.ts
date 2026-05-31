export class OrdersApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "OrdersApiError";
    this.status = status;
    this.code = code;
  }
}

export function isOrdersApiError(error: unknown): error is OrdersApiError {
  return error instanceof OrdersApiError;
}

export const OrdersErrorCodes = {
  NOT_FOUND: "ORDER_NOT_FOUND",
  FORBIDDEN: "ORDER_FORBIDDEN",
  CONFLICT: "ORDER_CONFLICT",
  VALIDATION: "ORDER_VALIDATION",
  INVALID_STATE: "ORDER_INVALID_STATE",
  IDEMPOTENCY: "ORDER_IDEMPOTENCY",
  AD_NOT_AVAILABLE: "ORDER_AD_NOT_AVAILABLE",
  SELF_PURCHASE: "ORDER_SELF_PURCHASE",
  DUPLICATE_ACTIVE: "ORDER_DUPLICATE_ACTIVE",
} as const;
