export type DynamicFieldType = "select";

export type DynamicFieldDef = {
  id: string;
  label: string;
  type: DynamicFieldType;
  options?: string[];
  /** When set, options come from model-maps keyed by parent field value */
  dependsOn?: string;
  optionsMapKey?: "phone_models" | "car_models" | "laptop_models";
  required?: boolean;
};

export type ResolvedDynamicFieldDef = DynamicFieldDef & {
  options: string[];
  required: boolean;
};

export type FieldGroupSlot = {
  fieldId: string;
  required?: boolean;
};

export type FieldGroupId =
  | "phone"
  | "tablet"
  | "laptop"
  | "desktop"
  | "tv"
  | "monitor"
  | "gaming"
  | "camera"
  | "headphones"
  | "smartwatch"
  | "cables"
  | "router"
  | "printer"
  | "elec_accessory"
  | "home_appliance"
  | "car"
  | "motorcycle"
  | "bicycle"
  | "scooter"
  | "auto_parts"
  | "tires"
  | "estate_apartment"
  | "estate_house"
  | "estate_room"
  | "estate_commercial"
  | "estate_land"
  | "furniture"
  | "kitchen"
  | "restaurant"
  | "decor"
  | "home_tools"
  | "workshop"
  | "health"
  | "garden"
  | "fashion_clothing"
  | "fashion_shoes"
  | "fashion_bags"
  | "fashion_jewelry"
  | "fashion_beauty"
  | "baby_stroller"
  | "baby_clothes"
  | "baby_toys"
  | "baby_furniture"
  | "baby_infant"
  | "pet_live"
  | "pet_supplies"
  | "sports"
  | "photo_gear"
  | "board_game"
  | "camping"
  | "hobby"
  | "shisha"
  | "book"
  | "instrument"
  | "media"
  | "ticket"
  | "service"
  | "job"
  | "exchange"
  | "lesson"
  | "neighborhood";

export type MetadataValidationResult = {
  ok: boolean;
  missing: Array<{ id: string; label: string }>;
};

export type AdDetailSpecRow = {
  id: string;
  label: string;
  value: string;
};
