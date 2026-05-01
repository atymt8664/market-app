import { MapPin, Eye, ThumbsUp, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";

/** Mirrors create-ad form values for preview (avoid circular imports). */
export type CreateAdPreviewFormValues = {
  title: string;
  description: string;
  price?: number | null;
  priceType: "fixed" | "negotiable" | "free" | "swap";
  type: "offer" | "request";
  categoryId: number;
  subcategoryId?: number | null;
  city: string;
  sellerName: string;
  sellerPhone: string;
};

export type CreateAdPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEdit: boolean;
  values: CreateAdPreviewFormValues;
  previewImages: string[];
  categoryLabel: string;
  subcategoryLabel: string | null;
  categoryPathLabel: string;
  shippingSummary: string[];
  promotionsSummary: string[];
  pickupOnly: boolean;
  currencyLabel: string;
  sellerSafetyAccepted: boolean;
  isSubmitting: boolean;
  onBackToEdit: () => void;
  onPublish: () => void;
};

export function CreateAdPreviewDialog({
  open,
  onOpenChange,
  isEdit,
  values,
  previewImages,
  categoryLabel,
  subcategoryLabel,
  categoryPathLabel,
  shippingSummary,
  promotionsSummary,
  pickupOnly,
  currencyLabel,
  sellerSafetyAccepted,
  isSubmitting,
  onBackToEdit,
  onPublish,
}: CreateAdPreviewDialogProps) {
  const { locale } = useLocale();
  const isFree = values.priceType === "free";
  const mainImage = previewImages[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[100dvh] w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl",
          "border-border bg-background",
          "[&>button:last-child]:hidden",
        )}
        dir={locale === "ar" ? "rtl" : "ltr"}
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3 text-right">
          <DialogTitle className="text-base font-bold">{t("create_ad.preview_dialog.title")}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {t("create_ad.preview_dialog.subtitle", {
              action: isEdit ? t("create_ad.preview_dialog.action_save") : t("create_ad.preview_dialog.action_publish"),
            })}
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="px-4 pt-2">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border bg-muted/40">
              {mainImage ? (
                <img
                  src={mainImage}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                  {t("ad_images_public.no_images")}
                </div>
              )}
              {previewImages.length > 1 && (
                <span className="absolute end-3 top-3 rounded-md bg-black/60 px-2 py-1 text-xs text-white">
                  1 / {previewImages.length}
                </span>
              )}
            </div>
            {previewImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto px-4 pb-1 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {previewImages.map((src, i) => (
                  <div
                    key={`${src}-${i}`}
                    className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border"
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    <span className="absolute bottom-0.5 start-0.5 rounded bg-black/60 px-1 text-[9px] text-white">
                      {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 px-4 py-4">
            <div className="rounded-2xl border border-border bg-card/70 p-4">
              <h2 className="mb-2 text-xl font-bold leading-tight">{values.title || "—"}</h2>
              {isFree ? (
                <div className="text-2xl font-bold text-primary">{t("ad-card.free")}</div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-2xl font-bold text-primary">
                  {formatPrice(values.price ?? null, values.priceType)}
                  {values.priceType === "negotiable" && (
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {t("ad-card.negotiable")}
                    </span>
                  )}
                </div>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t("create_ad.preview_dialog.display_currency", { currency: currencyLabel })}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{values.city || "—"}</span>
                <span className="opacity-50">•</span>
                <span>{t("create_ad.preview_dialog.preview_now")}</span>
              </div>
            </div>

            <div className="flex items-stretch divide-x divide-border/60 rounded-2xl border border-border bg-card px-2 py-2 text-xs text-muted-foreground [direction:rtl]">
              <div className="flex flex-1 items-center justify-center gap-1">
                <Eye className="h-4 w-4" />
                <span className="font-semibold text-foreground tabular-nums">0</span>
                <span className="text-[11px]">{t("ad_detail.views")}</span>
              </div>
              <div className="flex flex-1 items-center justify-center gap-1">
                <ThumbsUp className="h-4 w-4" />
                <span className="font-semibold tabular-nums">0</span>
              </div>
              <div className="flex flex-1 items-center justify-center gap-1">
                <Star className="h-4 w-4" />
                <span className="font-semibold tabular-nums">0</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/70 p-4">
              <h3 className="mb-2 font-semibold">{t("ad_detail.description")}</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {values.description || "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card/70 p-4 text-sm">
              <div className="flex justify-between gap-2 border-b border-border/50 py-2 first:pt-0">
                <span className="text-muted-foreground">{t("create_ad.preview_dialog.category")}</span>
                <span className="max-w-[60%] text-end font-medium">{categoryLabel}</span>
              </div>
              {subcategoryLabel && (
                <div className="flex justify-between gap-2 border-b border-border/50 py-2">
                  <span className="text-muted-foreground">{t("create_ad.preview_dialog.subcategory")}</span>
                  <span className="max-w-[60%] text-end font-medium">{subcategoryLabel}</span>
                </div>
              )}
              <div className="flex justify-between gap-2 border-b border-border/50 py-2">
                <span className="text-muted-foreground">{t("create_ad.preview_dialog.path")}</span>
                <span className="max-w-[65%] text-end text-xs font-medium leading-snug">
                  {categoryPathLabel || "—"}
                </span>
              </div>
              <div className="flex justify-between gap-2 border-b border-border/50 py-2">
                <span className="text-muted-foreground">{t("create_ad.preview_dialog.ad_type")}</span>
                <span className="font-medium">
                  {values.type === "offer" ? t("create_ad.type.offer") : t("create_ad.type.request")}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/70 p-4 text-sm">
              <h3 className="mb-2 font-semibold">{t("ad_detail.shipping_delivery")}</h3>
              {pickupOnly ? (
                <p>{t("ad_detail.pickup_only")}</p>
              ) : shippingSummary.length > 0 ? (
                <ul className="list-inside list-disc space-y-1 text-foreground/90">
                  {shippingSummary.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">{t("ad_detail.no_shipping_options")}</p>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card/70 p-4 text-sm">
              <h3 className="mb-2 font-semibold">{t("create_ad.preview_dialog.promotions_optional")}</h3>
              {promotionsSummary.length > 0 ? (
                <ul className="list-inside list-disc space-y-1">
                  {promotionsSummary.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">{t("create_ad.preview_dialog.none")}</p>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card/70 p-4 text-sm">
              <h3 className="mb-2 font-semibold">{t("create_ad.contact.title")}</h3>
              <p>
                <span className="text-muted-foreground">{t("create_ad.preview_dialog.name_label")} </span>
                {values.sellerName}
              </p>
              <p className="mt-1" dir="ltr">
                <span className="text-muted-foreground">{t("create_ad.preview_dialog.phone_label")} </span>
                {values.sellerPhone}
              </p>
            </div>

            <div
              className={cn(
                "rounded-xl border px-3 py-2 text-xs",
                sellerSafetyAccepted
                  ? "border-primary/30 bg-primary/5 text-foreground"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-200",
              )}
            >
              {sellerSafetyAccepted
                ? t("create_ad.preview_dialog.safety_accepted")
                : t("create_ad.preview_dialog.safety_not_accepted")}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-start">
            <Button
              type="button"
              className="h-11 w-full rounded-full bg-primary font-bold text-black sm:flex-1"
              onClick={onPublish}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                isEdit ? t("create_ad.loading.saving") : t("create_ad.loading.publishing")
              ) : isEdit ? (
                t("create_ad.save_changes")
              ) : (
                t("create_ad.publish")
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-full sm:flex-1"
              onClick={onBackToEdit}
              disabled={isSubmitting}
            >
              {t("create_ad.preview_dialog.back_to_edit")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
