import type { DynamicFieldDef } from "./types";

const OTHER = "أخرى";

export const PHONE_MODELS_BY_BRAND: Record<string, string[]> = {
  Apple: ["iPhone 16", "iPhone 15", "iPhone 14", "iPhone 13", "iPhone SE", OTHER],
  Samsung: ["Galaxy S24", "Galaxy S23", "Galaxy A54", "Galaxy A34", "Galaxy Z", OTHER],
  Huawei: ["P60", "P50", "Nova", "Mate", OTHER],
  Xiaomi: ["14", "13", "Redmi Note", "Poco", OTHER],
  Google: ["Pixel 9", "Pixel 8", "Pixel 7a", OTHER],
  OnePlus: ["12", "11", "Nord", OTHER],
  Oppo: ["Find X", "Reno", "A series", OTHER],
  Honor: ["Magic", "90", "X series", OTHER],
  Sony: ["Xperia 1", "Xperia 5", "Xperia 10", OTHER],
  [OTHER]: [OTHER],
};

export const LAPTOP_MODELS_BY_BRAND: Record<string, string[]> = {
  Apple: ["MacBook Air", "MacBook Pro 13", "MacBook Pro 14", "MacBook Pro 16", OTHER],
  Dell: ["XPS 13", "XPS 15", "Inspiron", "Latitude", OTHER],
  HP: ["Pavilion", "Envy", "Spectre", "EliteBook", OTHER],
  Lenovo: ["ThinkPad", "IdeaPad", "Legion", "Yoga", OTHER],
  Asus: ["ZenBook", "VivoBook", "ROG", "TUF", OTHER],
  Acer: ["Aspire", "Swift", "Predator", "Nitro", OTHER],
  MSI: ["Modern", "Katana", "Stealth", "Raider", OTHER],
  Microsoft: ["Surface Laptop", "Surface Pro", OTHER],
  [OTHER]: [OTHER],
};

export const CAR_MODELS_BY_BRAND: Record<string, string[]> = {
  BMW: ["Series 1", "Series 3", "Series 5", "X1", "X3", "X5", OTHER],
  Mercedes: ["A-Class", "C-Class", "E-Class", "GLA", "GLC", OTHER],
  Audi: ["A3", "A4", "A6", "Q3", "Q5", OTHER],
  Volkswagen: ["Golf", "Polo", "Passat", "Tiguan", "T-Roc", OTHER],
  Toyota: ["Yaris", "Corolla", "Camry", "RAV4", OTHER],
  Hyundai: ["i10", "i20", "i30", "Tucson", OTHER],
  Kia: ["Picanto", "Ceed", "Sportage", OTHER],
  Opel: ["Corsa", "Astra", "Insignia", OTHER],
  Ford: ["Fiesta", "Focus", "Kuga", OTHER],
  Renault: ["Clio", "Megane", "Captur", OTHER],
  Peugeot: ["208", "308", "3008", OTHER],
  Skoda: ["Fabia", "Octavia", "Kodiaq", OTHER],
  [OTHER]: [OTHER],
};

export type OptionsMapKey = NonNullable<DynamicFieldDef["optionsMapKey"]>;

export function resolveOptionsFromMap(
  mapKey: OptionsMapKey,
  parentValue: string | undefined,
): string[] {
  if (!parentValue?.trim()) return [];
  const key = parentValue.trim();
  const maps = {
    phone_models: PHONE_MODELS_BY_BRAND,
    laptop_models: LAPTOP_MODELS_BY_BRAND,
    car_models: CAR_MODELS_BY_BRAND,
  } as const;
  const map = maps[mapKey];
  return map[key] ?? map[OTHER] ?? [OTHER];
}

/** Fields cleared when parent manufacturer/brand changes */
export const DEPENDENT_CLEAR_MAP: Record<string, string[]> = {
  manufacturer: ["model"],
  car_brand: ["car_model"],
};
