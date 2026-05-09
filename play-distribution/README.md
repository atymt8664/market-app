# Play Distribution — PWA / TWA / أصول Google Play

مجلد **منفصل بالكامل** عن منطق تطبيق Souq في `artifacts/souq`. لا يغيّر شيفرة الواجهة أو الـ API؛ أي دمج مع الموقع يتم يدويًا عبر `pwa-dropin/INTEGRATION.md` عند رغبتك.

## ما تم إعداده

| المجلد / الملف | الغرض |
|-----------------|--------|
| `pwa-dropin/` | `manifest.webmanifest`، `sw.js`، أيقونات متعددة الأحجام، `INTEGRATION.md` |
| `twa/` | نموذج `twa-manifest.sample.json` + دليل Bubblewrap و **AAB** |
| `assets/brand/` | أيقونة SVG، شعار نصي (Latin للتصدير الآمن + نسخة عربية للمصمم) |
| `assets/raw-screens/` | لقطات PNG خام من الواجهة الحقيقية (يُولَّد بالسكربت) |
| `marketing/` | قوالب HTML للّقطات الترويجية والبانر والسبلاش |
| `store-exports/` | **المخرجات الجاهزة للرفع** (بعد تشغيل السكربتات) |
| `scripts/` | توليد الأيقونات، اللقطات، التركيب التسويقي |

## أسماء الحزمة (Android)

- **applicationId / packageId المقترَح:** `eu.souqarab.marketplace.twa`  
  (عدّل حسب التفرّد في Google Play قبل الإرسال النهائي.)

## المقاسات (مرجع سريع)

| أصل | مقاس | مسار جاهز بعد `pnpm run all-graphics` |
|-----|------|----------------------------------------|
| أيقونة Play | 512 × 512 | `store-exports/brand/final_play_store_icon_512.png` |
| Feature Graphic لـ Play (1024×500) | JPEG موصى به للرفع | `store-exports/feature-graphic/feature_graphic_1024x500.jpg` |
| Feature Graphic (مصدر كامل الإطار) | مطابق لـ `غلاف.jpg` | `store-exports/feature-graphic/feature_graphic_official.jpg` |
| لقطات هاتف ترويجية | أبعاد كل ملف في `FILE_MANIFEST.md` | `store-exports/play-phone-slides/1.jpg` — `9.jpg` بالترتيب المعتمد |
| أيقونة التطبيق / PWA | من `SA.jpg` | يُصدَّر إلى `artifacts/souq/public/icons/` عبر `pnpm --filter @local/play-distribution run wire-pwa-icons` |
| سبلاش مركزي للعلامة | 1290 × 2796 | `store-exports/splash/splash_brand_1290x2796.png` |
| أيقونات PWA | 72…512 + maskable | `pwa-dropin/icons/` |

## الأوامر

الخط النهائي للمتجر (بيانات تجريبية على الخادم المحلي ← لقطات خام ← تركيب شرائح ← Feature Graphic):

```bash
pnpm --filter @local/play-distribution run final-store
```

من جذر الـ monorepo (`Classified-Marketplace/`):

```bash
pnpm install
pnpm --filter @local/play-distribution run icons
pnpm --filter @local/play-distribution run provision
pnpm --filter @local/play-distribution run capture
pnpm --filter @local/play-distribution run compose
pnpm --filter @local/play-distribution run feature
pnpm --filter @local/play-distribution run splash
pnpm --filter @local/play-distribution run brand-rasters
```

أو من داخل `play-distribution/`:

```bash
pnpm run all-graphics
```

**شروط التشغيل:** Souq والـ API يعملان (مثل `pnpm dev:web` و `pnpm dev:api`). انسخ `env.capture.example` إلى `.env.capture.local` واملأ `STORE_SELLER_*`، `STORE_BUYER_*`، `DATABASE_URL`، و`STORE_ADMIN_PASSWORD` + `STORE_ADMIN_ACCESS_KEY` للّقطة الثامنة. يمكن تجاوز عنوان الواجهة بـ `SOUQ_URL`.

راجع **`STORE_QUALITY_REPORT.md`** للتفاصيل والتحذيرات (مثل تعطيل 2FA للأدمن أثناء اللقطات إن لزم).

## الجاهز مقابل ما يحتاج خطوة لاحقة

| جاهز هنا | يحتاج منك لاحقًا |
|-----------|-------------------|
| ملفات PWA للنسخ إلى استضافة HTTPS | رفع الملفات، ربط manifest و SW في الواجهة (يدويًا حسب `INTEGRATION.md`) |
| صور المتجر الترويجية، Feature Graphic، أيقونة، سبلاش علامة | رفعها إلى Play Console |
| عرض **Bubblewrap** وملف manifest نموذجي | تشغيل `bubblewrap init` بعد أن يكون manifest حيًا على HTTPS + JDK + Android SDK |
| — | توليد **AAB** عبر `bubblewrap build` + keystore + توقيع Play |

## تعديلات مستودع الداعمة (ملاحظة)

لتثبيت `sharp` وتشغيل السكربتات ضمن `pnpm workspace`:

- أُضيف `play-distribution` إلى `pnpm-workspace.yaml`.
- أُضيف `sharp` إلى قائمة `onlyBuiltDependencies` في نفس الملف لسماح بناء الإضافة الأصلية.

إن أردت عدم لمس إعدادات الـ monorepo، يمكنك نسخ مجلد `play-distribution/` خارج المستودع وتشغيل `npm install` محليًا مع تعديل المسارات — لكن البناء الحالي يفترض التكامل أعلاه.

## الهوية البصرية

خلفيات داكنة `#0a0d12` → `#10131a`، ليمون `#c2eb6c`، ظلال glow خفيفة، خطوط **Cairo + Inter** في الترويج لتطابق اتجاه التطبيق.

انظر أيضًا: `FILE_MANIFEST.md`.
