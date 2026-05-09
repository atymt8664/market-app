# المرحلة النهائية — لقطات Google Play (إنتاج كامل)

كل العمل داخل **`play-distribution`** فقط.

## ما الذي يحدث الآن؟

1. **`pnpm run provision`** (`scripts/provision-play-store-data.mjs`)
   - ينشئ 3 إعلانات عربية بصور Unsplash عالية الجودة (روابط HTTPS عامة).
   - يحدّث أسماء الحسابات عبر SQL عند توفر `DATABASE_URL`: Omar Frankfurt، Noor Hamburg.
   - يعتمد الإعلانات في قاعدة البيانات (`status=approved`) ويعيّن إعلانًا مميزًا.
   - يملأ المفضلة ومحادثة كاملة بالرسائل المطلوبة تقريبًا.
   - يكتب **`assets/store-state.json`** (معرف الإعلان الأساسي + المحادثة).

2. **`pnpm run capture`**
   - يقرأ الحسابات من البيئة و`store-state.json`.
   - يلتقط **8 لقطات خام** في `assets/raw-screens/` بدون ضيف/بوابات تسجيل (كلها جلسات حقيقية ما عدا الرئيسية العامة).
   - يطبّق **`store-sanitize.mjs`** لتقليل أي بقايا نصية غير مرغوبة.
   - يتطلب **`STORE_ADMIN_PASSWORD`** و **`STORE_ADMIN_ACCESS_KEY`** للّقطة الثامنة (لوحة `/admin`).

3. **`pnpm run compose`** + **`pnpm run feature`**
   - يُحدّث `store-exports/play-phone-slides/*.png` و**Feature Graphic** من نفس اللقطات الخام.

## الأمر الواحد الكامل

من جذر المستودع:

```bash
pnpm --filter @local/play-distribution run final-store
```

## المتطلبات قبل التشغيل

- تشغيل **API** و **Souq** محليًا (`pnpm dev:api` + `pnpm dev:web`).
- ملف **`.env.capture.local`** مكتمل كما في **`env.capture.example`**.
- حساب بائع ≠ حساب مشترٍ (لا تراسل إعلانك بنفس الحساب).
- لوحة الإدارة: تعطيل **2FA مؤقتًا** على حساب الأدمن إن كان يعرقل `/api/admin-login` أثناء التقاط الصور.

## المخرجات النهائية

| نوع | مسار |
|-----|------|
| لقطات Play (المرتّبة رسميًا) | `store-exports/play-phone-slides/1.jpg` … `9.jpg` — انظر `FILE_MANIFEST.md` |
| أيقونة التطبيق الرسمية | `store-exports/play-phone-slides/SA.jpg` → يُصدَّر إلى أيقونات الموقع عبر `wire-pwa-icons` |
| Feature Graphic الرسمي | المصدر: `play-phone-slides/غلاف.jpg`؛ رفع Play (1024×500): `feature-graphic/feature_graphic_1024x500.jpg`؛ نسخة كاملة الإطار: `feature-graphic/feature_graphic_official.jpg` |
| أرشيف اللقطات السابقة | `store-exports/play-phone-slides/archive/` و `assets/raw-screens/archive/` |

## التحقق من النصوص المحظورة

السكربت يزيل في DOM أمثال: Staging، Demo، Test، Guest، Placeholder، No image، No results، وأرقام الهاتف النموذجية.  
ما يزال يمكن أن يظهر نص داخل **صورة إعلان مرفوعة** كملف — استبدل تلك الصور من لوحة الإدارة إن لزم.
