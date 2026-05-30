import type {
  OrderIssueRow,
  OrderRow,
  OrderStatusHistoryRow,
  ShipmentEventRow,
  ShipmentRow,
} from "../schema/p17-orders";
import {
  ORDER_ACTOR_TYPES,
  ORDER_ISSUE_CATEGORIES,
  ORDER_ISSUE_STATUSES,
  ORDER_STATUSES,
  SHIPMENT_EVENT_CODES,
  SHIPMENT_EVENT_SOURCES,
  FULFILLMENT_MODES,
} from "./constants";

export {
  ORDER_STATUSES,
  FULFILLMENT_MODES,
  ORDER_ACTOR_TYPES,
  ORDER_ISSUE_CATEGORIES,
  ORDER_ISSUE_STATUSES,
  SHIPMENT_EVENT_CODES,
  SHIPMENT_EVENT_SOURCES,
} from "./constants";

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type FulfillmentMode = (typeof FULFILLMENT_MODES)[number];
export type OrderActorType = (typeof ORDER_ACTOR_TYPES)[number];
export type OrderIssueCategory = (typeof ORDER_ISSUE_CATEGORIES)[number];
export type OrderIssueStatus = (typeof ORDER_ISSUE_STATUSES)[number];
export type ShipmentEventCode = (typeof SHIPMENT_EVENT_CODES)[number];
export type ShipmentEventSource = (typeof SHIPMENT_EVENT_SOURCES)[number];

export type Order = OrderRow;
export type Shipment = ShipmentRow;
export type OrderIssue = OrderIssueRow;

/** Unified public timeline row — status history or shipment events (P17-2 §5). */
export type TimelineEntry =
  | {
      kind: "status_history";
      id: number;
      orderId: number;
      fromStatus: OrderStatus | null;
      toStatus: OrderStatus;
      actorType: OrderActorType;
      actorUserId: number | null;
      eventCode: string;
      publicMessageAr: string | null;
      occurredAt: Date;
      row: OrderStatusHistoryRow;
    }
  | {
      kind: "shipment_event";
      id: number;
      orderId: number;
      eventCode: ShipmentEventCode;
      descriptionAr: string | null;
      occurredAt: Date;
      source: ShipmentEventSource;
      row: ShipmentEventRow;
    };

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function isTerminalOrderStatus(status: OrderStatus): boolean {
  return status === "completed" || status === "cancelled";
}
