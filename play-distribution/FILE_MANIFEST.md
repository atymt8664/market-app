# قائمة الملفات والمقاسات



## `pwa-dropin/` — مرجع للدمج في `artifacts/souq/public/`



| الملف | الوصف |

|--------|--------|

| `manifest.webmanifest` | Web App Manifest كامل — `display: standalone`، ألوان الثيم |

| `sw.js` | Service Worker — تخزين مسبق محدود + شبكة للـ `/api` |

| `icons/pwa-icon-{72,96,128,144,152,192,384,512}.png` | أيقونات غرض `any` (**المُصدَّرة من `SA.jpg` الرسمي**) |

| `icons/pwa-maskable-512.png` | أيقونة maskable (**مشتقة من `SA.jpg` مع خلفية `#10131a`**) |

| `INTEGRATION.md` | خطوات الدمج اليدوي دون تعديل تلقائي لـ Souq |



**في الإنتاج الحي:** نفس أسماء الملفات تحت `https://www.souq-arab.com/icons/` لمطابقة Bubblewrap (`twa-manifest.sample.json`).



## `store-exports/play-phone-slides/` — أصول المتجر النهائية (الترتيب الرسمي الحالي)



لا تعيد تسمية أو إعادة ترتيب الملفات في هذا المجلد؛ ارفع إلى Play Console بنفس الترتيم المعروض.



| الملف | المحتوى الرسمي | المقاس (بكسل) |

|--------|----------------|---------------|

| `1.jpg` | الصفحة الرئيسية | 592×1280 |

| `2.jpg` | تسجيل الدخول | 655×1280 |

| `3.jpg` | إنشاء إعلان | 592×1280 |

| `4.jpg` | الرسائل | 613×1280 |

| `5.jpg` | المفضلة | 605×1280 |

| `6.jpg` | تفاصيل الإعلان | 819×1280 |

| `7.jpg` | طرق الشحن | 668×1280 |

| `8.jpg` | الترويج | 605×1280 |

| `9.jpg` | الإعدادات / الحساب | 590×1280 |

| `SA.jpg` | الأيقونة الرسمية للتطبيق (مصدر أيقونات PWA/TWA) | 1254×1254 |

| `غلاف.jpg` | غلاف Feature Graphic الرسمي (نسخة المصدر في المجلد) | 1280×720 |



> **Google Play — Feature Graphic:** المواصفة الشائعة **1024×500**. المصدر البصري `غلاف.jpg` (1280×720) دون تعديل؛ نسخة الرفع الموصى بها في الجدول التالي.



## `store-exports/feature-graphic/`



| الملف | الوصف | المقاس |

|--------|--------|--------|

| `feature_graphic_1024x500.jpg` | **نسخة الرفع الموصى بها لـ Play** — مُصدَّرة من `غلاف.jpg` بـ `fit: contain` على خلفية `#10131a` (بدون تشويه) | 1024×500 |

| `feature_graphic_official.jpg` | نسخة ثنائية مطابقة لـ `play-phone-slides/غلاف.jpg` | 1280×720 |

| `feature_graphic_1024x500.png` | أصل قديم مُصدَّر آليًا (مرجع فقط إن وُجد) | 1024×500 |



## `store-exports/splash/`



| الملف | المقاس |

|--------|--------|

| `splash_brand_1290x2796.png` | 1290×2796 (مرجع سبلاش للعلامة) |



## `store-exports/brand/`



| الملف | المقاس |

|--------|--------|

| `app_icon_raster_512.png` | 512×512 |

| `app_icon_raster_1024.png` | 1024×1024 |

| `app_icon_maskable_512.png` | 512×512 |

| `logo_wordmark_default.png` | من SVG (~960×240) |

| `final_play_store_icon_512.png` | 512×512 — مرجع سابق |



**أيقونة حزمة التطبيق وPWA/TWA:** تُشتق من **`play-phone-slides/SA.jpg`** إلى `artifacts/souq/public/icons/` عبر `pnpm --filter @local/play-distribution run wire-pwa-icons`.



## `assets/brand/` — متجهات



| الملف |

|--------|

| `icon-master.svg` |

| `logo-wordmark.svg` (Latin — يصدَّر بـ sharp بلا مشاكل ترميز) |

| `logo-wordmark-ar.svg` (عربي — للتعديل في Figma/Inkscape) |



## `twa/`



| الملف |

|--------|

| `twa-manifest.sample.json` |

| `BUBBLEWRAP_AND_AAB.md` |



---



**ملاحظة:** مشروع Gradle الكامل لـ TWA يُنشَأ محليًا عبر `bubblewrap init` بعد توفر manifest على HTTPS؛ لا يُرفَع هنا لأسباب التوقيع والنطاق.

