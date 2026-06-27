# Product Metadata Blueprint

**الإصدار:** 1.0  
**التاريخ:** 2025-06-27  
**المرجع:** [Marketplace-Taxonomy-Architecture-Blueprint-v3.md](./Marketplace-Taxonomy-Architecture-Blueprint-v3.md) v3.1  
**الحالة:** منفّذ محليًا — بانتظار اعتماد PO  

---

## 1. الهدف

طبقة **Product Metadata** موحّدة عبر **Metadata Engine** — لا 89 ملفًا، بل:

```
Field Catalog (تعريف الحقول مرة واحدة)
    ↓
Field Groups (تجميع حسب نوع المنتج)
    ↓
Category Map (slug::sub → group)
    ↓
Engine (resolve + validate + dependencies)
    ↓
Create Ad / Ad Detail / (مستقبلًا Search/Filters)
```

**SSOT للكود:** `artifacts/souq/src/lib/product-metadata/`

| الملف | الدور |
|-------|------|
| `field-catalog.ts` | تعريف كل حقل مرة واحدة |
| `field-groups.ts` | 61 مجموعة قابلة لإعادة الاستخدام |
| `category-map.ts` | 89 فئة → مجموعة |
| `model-maps.ts` | manufacturer → model (هاتف، لابتوب، سيارة) |
| `engine.ts` | API عامة |

---

## 2. Manufacturer Flow (القرار النهائي)

| الخيار | القرار |
|--------|--------|
| جزء من التصنيف (مستوى 3) | **مرفوض** — P-03 Blueprint |
| خطوة مستقلة | **مرفوض** — ثقل على UX |
| **Dynamic Field بعد الفئة** | **مُعتمد** |

- التخزين: `details.specs.manufacturer` / `car_brand`
- العرض: Create Ad + Ad Detail عبر نفس الـ Engine
- التبعية: تغيير الشركة → مسح الموديل + تحديث الخيارات

---

## 3. Field Groups (61 مجموعة)

| المجموعة | الاستخدام |
|----------|-----------|
| phone, tablet, laptop, desktop, tv, monitor, gaming, camera, headphones, smartwatch, cables, router, printer, elec_accessory, home_appliance | إلكترونيات |
| car, motorcycle, bicycle, scooter, auto_parts, tires | مركبات |
| estate_apartment, estate_house, estate_room, estate_commercial, estate_land | عقارات |
| furniture, kitchen, restaurant, decor, home_tools, workshop, health, garden | منزل |
| fashion_clothing, fashion_shoes, fashion_bags, fashion_jewelry, fashion_beauty | أزياء |
| baby_* (5) | عائلة |
| pet_live, pet_supplies | حيوانات |
| sports, photo_gear, board_game, camping, hobby, shisha | ترفيه |
| book, instrument, media | موسيقى/كتب |
| ticket, service, job, exchange, lesson, neighborhood | خدمات/وظائف/مجتمع |

**التغطية:** 89/89 فئة مربوطة بمجموعة.

---

## 4. Mandatory / Optional

| النمط | إلزامي | اختياري |
|-------|--------|---------|
| منتجات مادية | `condition` | لون، ملحقات |
| هواتف/تابلت | manufacturer, model, condition | storage, color |
| سيارات | car_brand, car_model, year, mileage, fuel, transmission, condition | color |
| عقارات شقق | area, rooms | bathrooms, floor, furnished |
| خدمات | service_area | availability |
| وظائف | industry, experience | — |
| تذاكر | event_date, quantity | venue |

التحقق: `validateProductMetadata()` قبل النشر في Create Ad.

---

## 5. Field Dependencies

| الحقل الأب | الحقل الابن | السلوك |
|-----------|-------------|--------|
| manufacturer | model | خيارات من `PHONE_MODELS_BY_BRAND` |
| manufacturer (laptop) | model | `LAPTOP_MODELS_BY_BRAND` |
| car_brand | car_model | `CAR_MODELS_BY_BRAND` |

عند تغيير الأب: مسح الابن + تعطيل الاختيار حتى يُختار الأب.

---

## 6. Search & Filter Readiness

| حقل | Filter | Search | Similar | Analytics |
|-----|--------|--------|---------|-----------|
| condition | ✅ | ✅ | ✅ | ✅ |
| manufacturer / car_brand | ✅ | ✅ | ✅ | ✅ |
| year, mileage, area, rooms | ✅ | ✅ | ✅ | ✅ |
| accessory_type, hobby_type | ⚠️ | ✅ | ⚠️ | ✅ |

**التخزين:** `details.specs` JSONB — جاهز لفهرسة لاحقة (`specs->>'condition'`).

---

## 7. Migration / Rollback

- لا تغيير في شجرة التصنيفات
- لا هجرة إعلانات قديمة مطلوبة (staging test data)
- Rollback: `git checkout` على `product-metadata/` + `create-ad.tsx` + `create-ad-dynamic-fields.ts`

---

**نهاية Product Metadata Blueprint v1.0**
