import type { OrderDetail, OrderTimelineEntry } from "./orders-api.types";

export type TrackingDateChip = {
  id: string;
  labelKey: string;
  isoDate: string;
};

export type ShipmentEventView = {
  id: string;
  messageAr: string;
  occurredAt: string;
  eventCode: string;
};

const DELIVERED_EVENT_CODES = new Set([
  "delivered",
  "buyer_confirmed_delivery",
  "order_completed",
]);

const SHIPPING_EVENT_PREFIXES = [
  "seller_marked_shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "shipment_",
];

function isShippingRelatedEvent(eventCode: string): boolean {
  if (SHIPPING_EVENT_PREFIXES.some((p) => eventCode === p || eventCode.startsWith(p))) {
    return true;
  }
  return DELIVERED_EVENT_CODES.has(eventCode);
}

export function formatTrackingChipDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function formatTrackingEtaDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function findTimelineDate(items: OrderTimelineEntry[], codes: Set<string>): string | null {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const entry = items[i]!;
    if (codes.has(entry.eventCode)) return entry.occurredAt;
  }
  return null;
}

/** P17-8-0 §1.8 — max 3 date chips, never guess ETA. */
export function buildTrackingDateChips(
  order: Pick<OrderDetail, "createdAt" | "status" | "fulfillmentMode" | "shipment">,
  timelineItems: OrderTimelineEntry[],
): TrackingDateChip[] {
  if (order.fulfillmentMode === "pickup") {
    return [
      {
        id: "placed",
        labelKey: "p17.commerce.tracking.chip_placed",
        isoDate: order.createdAt,
      },
    ].slice(0, 3);
  }

  const chips: TrackingDateChip[] = [
    {
      id: "placed",
      labelKey: "p17.commerce.tracking.chip_placed",
      isoDate: order.createdAt,
    },
  ];

  const shippedAt = order.shipment?.shippedAt;
  if (shippedAt) {
    chips.push({
      id: "shipped",
      labelKey: "p17.commerce.tracking.chip_shipped",
      isoDate: shippedAt,
    });
  }

  const deliveredAt = findTimelineDate(timelineItems, DELIVERED_EVENT_CODES);
  if (deliveredAt && ["delivered", "buyer_confirmed", "completed"].includes(order.status)) {
    chips.push({
      id: "delivered",
      labelKey: "p17.commerce.tracking.chip_delivered",
      isoDate: deliveredAt,
    });
  } else if (order.shipment?.etaAt) {
    chips.push({
      id: "eta",
      labelKey: "p17.commerce.tracking.chip_eta",
      isoDate: order.shipment.etaAt,
    });
  }

  return chips.slice(0, 3);
}

export function buildShipmentEvents(
  order: Pick<OrderDetail, "fulfillmentMode">,
  timelineItems: OrderTimelineEntry[],
): ShipmentEventView[] {
  if (order.fulfillmentMode === "pickup") {
    return timelineItems.map((e) => ({
      id: e.id,
      messageAr: e.messageAr,
      occurredAt: e.occurredAt,
      eventCode: e.eventCode,
    }));
  }
  return timelineItems
    .filter((e) => isShippingRelatedEvent(e.eventCode) || e.eventCode === "order_submitted" || e.eventCode === "seller_confirmed_order" || e.eventCode === "seller_started_preparing")
    .map((e) => ({
      id: e.id,
      messageAr: e.messageAr,
      occurredAt: e.occurredAt,
      eventCode: e.eventCode,
    }));
}

export function hasTrackingDetails(
  order: Pick<OrderDetail, "fulfillmentMode" | "shipment">,
): boolean {
  return (
    order.fulfillmentMode === "shipping" &&
    Boolean(order.shipment?.carrierLabel?.trim() && order.shipment?.trackingNumber?.trim())
  );
}
