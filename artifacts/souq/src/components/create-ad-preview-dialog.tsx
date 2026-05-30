import { MapPin, Eye, ThumbsUp, Star, X } from "lucide-react";
import { AdNoImagePlaceholderBlock } from "@/components/ad-card-no-image-placeholder";
import {
  Dialog,
  DialogClose,
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

  const previewCloseBtn =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/45 bg-zinc-950/90 text-primary transition-colors hover:border-primary/65 hover:bg-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 active:opacity-90";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className={cn(
          "flex max-h-[100dvh] w-full max-w-lg flex-col gap-0 overflow-hidden border-primary/35 bg-[#0A0A0A] p-0 shadow-2xl ring-1 ring-primary/20 sm:max-w-2xl sm:rounded-2xl",
        )}
        dir={locale === "ar" ? "rtl" : "ltr"}
      >
        <DialogHeader className="shrink-0 border-b border-primary/20 px-4 py-3 text-right">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-bold text-white">
                {t("create_ad.preview_dialog.title")}
              </DialogTitle>
              <p className="mt-1 text-xs text-zinc-400">
                {t("create_ad.preview_dialog.subtitle", {
                  action: isEdit ? t("create_ad.preview_dialog.action_save") : t("create_ad.preview_dialog.action_publish"),
                })}
              </p>
            </div>
            <DialogClose
              type="button"
              className={previewCloseBtn}
              aria-label={t("create_ad.images.close")}
            >
              <X className="h-4 w-4" />
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="px-4 pt-2">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-primary/32 bg-[#0A0A0A] ring-1 ring-primary/10">
              {mainImage ? (
                <img
                  src={mainImage}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <AdNoImagePlaceholderBlock className="h-full w-full rounded-2xl border-0 ring-0" />
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
                    className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-primary/30"
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
            <div className="rounded-2xl border border-primary/35 bg-zinc-950/75 p-4 shadow-[0_0_20px_-12px_hsl(var(--primary)/0.15)] ring-1 ring-primary/10">
              <h2 className="mb-2 text-xl font-bold leading-tight text-white">{values.title || "—"}</h2>
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
              <p className="mt-1 text-[11px] text-zinc-500">
                {t("create_ad.preview_dialog.display_currency", { currency: currencyLabel })}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-400">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{values.city || "—"}</span>
                <span className="opacity-50">•</span>
                <span>{t("create_ad.preview_dialog.preview_now")}</span>
              </div>
            </div>

            <div className="flex items-stretch divide-x divide-primary/20 rounded-2xl border border-primary/30 bg-zinc-950/70 px-2 py-2 text-xs text-zinc-400 [direction:rtl]">
              <div className="flex flex-1 items-center justify-center gap-1">
                <Eye className="h-4 w-4" />
                <span className="font-semibold tabular-nums text-white">0</span>
                <span className="text-[11px]">{t("ad_detail.views")}</span>
              </div>
              <div className="flex flex-1 items-center justify-center gap-1">
                <ThumbsUp className="h-4 w-4" />
                <span className="font-semibold tabular-nums text-white">0</span>
              </div>
              <div className="flex flex-1 items-center justify-center gap-1">
                <Star className="h-4 w-4" />
                <span className="font-semibold tabular-nums text-white">0</span>
              </div>
            </div>

            <div className="rounded-2xl border border-primary/35 bg-zinc-950/75 p-4 ring-1 ring-primary/10">
              <h3 className="mb-2 font-semibold text-white">{t("ad_detail.description")}</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
                {values.description || "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-primary/35 bg-zinc-950/75 p-4 text-sm ring-1 ring-primary/10">
              <div className="flex justify-between gap-2 border-b border-primary/15 py-2 first:pt-0">
                <span className="text-zinc-500">{t("create_ad.preview_dialog.category")}</span>
                <span className="max-w-[60%] text-end font-medium text-white">{categoryLabel}</span>
              </div>
              {subcategoryLabel && (
                <div className="flex justify-between gap-2 border-b border-primary/15 py-2">
                  <span className="text-zinc-500">{t("create_ad.preview_dialog.subcategory")}</span>
                  <span className="max-w-[60%] text-end font-medium text-white">{subcategoryLabel}</span>
                </div>
              )}
              <div className="flex justify-between gap-2 border-b border-primary/15 py-2">
                <span className="text-zinc-500">{t("create_ad.preview_dialog.path")}</span>
                <span className="max-w-[65%] text-end text-xs font-medium leading-snug text-white">
                  {categoryPathLabel || "—"}
                </span>
              </div>
              <div className="flex justify-between gap-2 border-b border-primary/15 py-2">
                <span className="text-zinc-500">{t("create_ad.preview_dialog.ad_type")}</span>
                <span className="font-medium text-white">
                  {values.type === "offer" ? t("create_ad.type.offer") : t("create_ad.type.request")}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-primary/35 bg-zinc-950/75 p-4 text-sm ring-1 ring-primary/10">
              <h3 className="mb-2 font-semibold text-white">{t("ad_detail.shipping_delivery")}</h3>
              {pickupOnly ? (
                <p className="text-zinc-200">{t("ad_detail.pickup_only")}</p>
              ) : shippingSummary.length > 0 ? (
                <ul className="list-inside list-disc space-y-1 text-zinc-200">
                  {shippingSummary.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-zinc-500">{t("ad_detail.no_shipping_options")}</p>
              )}
            </div>

            <div className="rounded-2xl border border-primary/35 bg-zinc-950/75 p-4 text-sm ring-1 ring-primary/10">
              <h3 className="mb-2 font-semibold text-white">{t("create_ad.preview_dialog.promotions_optional")}</h3>
              {promotionsSummary.length > 0 ? (
                <ul className="list-inside list-disc space-y-1 text-zinc-200">
                  {promotionsSummary.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-zinc-500">{t("create_ad.preview_dialog.none")}</p>
              )}
            </div>

            <div className="rounded-2xl border border-primary/35 bg-zinc-950/75 p-4 text-sm ring-1 ring-primary/10">
              <h3 className="mb-2 font-semibold text-white">{t("create_ad.contact.title")}</h3>
              <p className="text-zinc-200">
                <span className="text-zinc-500">{t("create_ad.preview_dialog.name_label")} </span>
                {values.sellerName}
              </p>
              <p className="mt-1 text-zinc-200" dir="ltr">
                <span className="text-zinc-500">{t("create_ad.preview_dialog.phone_label")} </span>
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

        <div className="shrink-0 border-t border-primary/20 bg-[#0A0A0A] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-start">
            <Button
              type="button"
              className="h-11 w-full rounded-full bg-primary font-bold text-black shadow-[0_0_18px_-10px_hsl(var(--primary)/0.4)] sm:min-h-11 sm:flex-1"
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
              className="h-11 w-full rounded-full border-primary/40 bg-zinc-950/80 text-foreground hover:border-primary/55 hover:bg-zinc-900 sm:flex-1"
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
