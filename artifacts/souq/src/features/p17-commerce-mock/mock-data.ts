import type { MockAddress, MockOrder, MockProduct, MockShippingOption, SellerMockOrder } from "./types";

export const MOCK_PRODUCT: MockProduct = {
  id: "mock-ad-001",
  title: "iPhone 15 Pro",
  price: 750,
  condition: "ممتاز — 256GB",
};

export const MOCK_ADDRESSES: MockAddress[] = [
  { id: "home", label: "المنزل", city: "Leipzig", country: "Germany" },
  { id: "work", label: "العمل", city: "Berlin", country: "Germany" },
];

export const MOCK_SHIPPING_OPTIONS: MockShippingOption[] = [
  { id: "dhl", label: "DHL Paket", cost: 5 },
  { id: "pickup", label: "الاستلام الشخصي", cost: 0 },
];

export const INITIAL_BUYER_ORDERS: MockOrder[] = [
  {
    id: "SOUQ-2026-001001",
    productTitle: "iPhone 15 Pro",
    price: 750,
    shippingCost: 5,
    total: 755,
    status: "pending_seller",
    lastUpdated: "منذ 10 دقائق",
    shippingMethod: "DHL Paket",
    addressLabel: "Leipzig, Germany",
    timelineActiveIndex: 1,
  },
  {
    id: "SOUQ-2026-000892",
    productTitle: "ساعة Apple Watch Ultra",
    price: 420,
    shippingCost: 0,
    total: 420,
    status: "in_transit",
    lastUpdated: "منذ يومين",
    shippingMethod: "الاستلام الشخصي",
    addressLabel: "Berlin, Germany",
    carrier: "DHL",
    trackingNumber: "MOCK-TRK-89201",
    timelineActiveIndex: 5,
  },
  {
    id: "SOUQ-2026-000701",
    productTitle: "MacBook Air M2",
    price: 980,
    shippingCost: 8,
    total: 988,
    status: "completed",
    lastUpdated: "منذ أسبوع",
    shippingMethod: "DHL Paket",
    addressLabel: "Munich, Germany",
    carrier: "DHL",
    trackingNumber: "MOCK-TRK-70144",
    timelineActiveIndex: 8,
  },
];

export const INITIAL_SELLER_ORDERS: SellerMockOrder[] = [
  {
    id: "SOUQ-2026-001042",
    productTitle: "iPhone 15 Pro",
    price: 750,
    shippingCost: 5,
    total: 755,
    buyerName: "أحمد م.",
    status: "pending_seller",
    createdAt: "منذ 5 دقائق",
    shippingMethod: "DHL Paket",
    addressLabel: "Leipzig, Germany",
  },
  {
    id: "SOUQ-2026-000955",
    productTitle: "AirPods Pro 2",
    price: 180,
    shippingCost: 4,
    total: 184,
    buyerName: "سارة ك.",
    status: "confirmed",
    createdAt: "منذ 3 ساعات",
    shippingMethod: "DHL Paket",
    addressLabel: "Hamburg, Germany",
  },
  {
    id: "SOUQ-2026-000811",
    productTitle: "iPad Air",
    price: 520,
    shippingCost: 6,
    total: 526,
    buyerName: "محمد ر.",
    status: "preparing",
    createdAt: "أمس",
    shippingMethod: "DHL Paket",
    addressLabel: "Frankfurt, Germany",
    carrier: "DHL",
  },
];

export const MOCK_CARRIERS = ["DHL", "Hermes", "DPD", "GLS"];
