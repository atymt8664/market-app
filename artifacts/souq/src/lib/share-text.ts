import type { Ad } from "@workspace/api-client-react";
import { t } from "@/i18n";
import { formatPrice } from "@/lib/format";

/** نص مشاركة إعلان (عنوان، سعر، مدينة، رابط) — بلا وصف طويل ليتناسب مع واتساب. */
export function buildAdShareText(ad: Ad, publicUrl: string): string {
  const isFree = ad.priceType === "free";
  const priceLine = isFree
    ? `${t("share.ad.price")}: ${t("ad-card.free")}`
    : `${t("share.ad.price")}: ${formatPrice(ad.price, ad.priceType)}`;
  const cityTrim = ad.city?.trim();
  const cityLine = cityTrim
    ? `${t("share.ad.city")}: ${cityTrim}`
    : null;
  const blurb = t("share.ad.on_brand", { brand: `${t("app.brand")}` });
  return [ad.title, priceLine, cityLine, blurb, publicUrl].filter(Boolean).join("\n");
}

export function buildProfileShareText(
  name: string,
  city: string | undefined,
  publicUrl: string,
): string {
  const cityTrim = city?.trim();
  const cityLine = cityTrim
    ? `${t("share.profile.city")}: ${cityTrim}`
    : null;
  const blurb = t("share.profile.blurb");
  return [name, cityLine, blurb, publicUrl].filter(Boolean).join("\n");
}
