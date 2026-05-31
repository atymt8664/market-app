export type OrdersApiErrorPayload = {
  error?: string;
  code?: string;
};

export class OrdersApiClientError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly payload: OrdersApiErrorPayload;

  constructor(status: number, payload: OrdersApiErrorPayload) {
    super(payload.error ?? `orders_error_${status}`);
    this.name = "OrdersApiClientError";
    this.status = status;
    this.code = payload.code;
    this.payload = payload;
  }
}
