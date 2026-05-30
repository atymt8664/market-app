export type CheckoutStep = "address" | "shipping" | "summary";

export type OrderStatus =
  | "pending_seller"
  | "confirmed"
  | "preparing"
  | "shipped"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled";

export type TimelineStepId =
  | "created"
  | "awaiting_seller"
  | "seller_confirmed"
  | "preparing"
  | "shipped"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "completed";

export interface MockProduct {
  id: string;
  title: string;
  price: number;
  condition: string;
}

export interface MockAddress {
  id: string;
  label: string;
  city: string;
  country: string;
}

export interface MockShippingOption {
  id: string;
  label: string;
  cost: number;
}

export interface MockOrder {
  id: string;
  productTitle: string;
  price: number;
  shippingCost: number;
  total: number;
  status: OrderStatus;
  lastUpdated: string;
  shippingMethod: string;
  addressLabel: string;
  trackingNumber?: string;
  carrier?: string;
  timelineActiveIndex: number;
}

export interface SellerMockOrder {
  id: string;
  productTitle: string;
  price: number;
  shippingCost: number;
  total: number;
  buyerName: string;
  status: "pending_seller" | "confirmed" | "preparing" | "shipped" | "completed" | "cancelled";
  createdAt: string;
  shippingMethod: string;
  addressLabel: string;
  trackingNumber?: string;
  carrier?: string;
}
