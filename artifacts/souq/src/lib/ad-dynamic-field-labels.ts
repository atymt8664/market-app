/** Arabic labels for dynamic spec keys used in create-ad category tree */
export const AD_DYNAMIC_FIELD_LABELS: Record<string, string> = {
  color: "اللون",
  condition: "الحالة",
  storage: "السعة التخزينية",
  accessories: "الجهاز والملحقات",
  car_brand: "الشركة",
  car_model: "الموديل",
  year: "سنة الصنع",
  mileage: "عدد الكيلومترات",
  fuel: "نوع الوقود",
  transmission: "ناقل الحركة",
  estate_type: "نوع العقار",
  area: "المساحة",
  rooms: "عدد الغرف",
  rent_sale: "الإيجار/البيع",
};

export function labelForSpecKey(key: string): string {
  return AD_DYNAMIC_FIELD_LABELS[key] ?? key.replace(/_/g, " ");
}
