/**
 * Shared z-index tiers for overlays that must sit above Leaflet map compositor layers
 * (notably iOS Safari GPU tile promotion above default Radix z-50).
 */
export const UI_LAYER_ABOVE_LEAFLET = "z-[60]" as const;
export const UI_LAYER_ABOVE_LEAFLET_OVERLAY = "z-[60] bg-black/80" as const;
