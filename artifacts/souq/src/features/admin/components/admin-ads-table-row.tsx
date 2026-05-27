import { memo } from "react";
import {
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { SlaStatusBadge } from "@/features/admin/components/sla-status-badge";
import {
  ADMIN_ROW_ACTION_BASE,
  ADMIN_TABLE_ROW,
} from "@/features/admin/admin-interaction-classes";
import type { AdminAd } from "@/features/admin/types";
import { getLocale, t } from "@/i18n";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const AD_STATUS_KEYS: Record<string, string> = {
  pending: "p8.admin.ads.status_pending",
  approved: "p8.admin.ads.status_approved",
  rejected: "p8.admin.ads.status_rejected",
  hidden: "p8.admin.ads.status_hidden",
};

export function statusLabel(status: string) {
  const key = AD_STATUS_KEYS[status];
  return key ? t(key) : status;
}

export function statusBadgeClass(status: string) {
  if (status === "pending") return "border-amber-500/45 bg-amber-500/15 text-amber-200";
  if (status === "approved") return "border-emerald-500/45 bg-emerald-500/15 text-emerald-200";
  if (status === "rejected") return "border-orange-500/45 bg-orange-500/12 text-orange-200";
  if (status === "hidden") return "border-zinc-600 bg-zinc-800/80 text-zinc-300";
  return "border-primary/35 bg-primary/10 text-primary";
}

export function FeaturedStripBadge({ featured }: { featured: boolean }) {
  if (!featured) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/45 bg-primary/12 px-2 py-0.5 text-xs font-medium text-primary shadow-[0_0_12px_-8px_hsl(var(--primary)/0.35)]">
      <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
      {t("p8.admin.common.featured")}
    </span>
  );
}

export function FeaturedToggleButtons({
  ad,
  disabled,
  onRequest,
}: {
  ad: AdminAd;
  disabled: boolean;
  onRequest: (ad: AdminAd, nextFeatured: boolean) => void;
}) {
  if (ad.featured) {
    return (
      <button
        type="button"
        onClick={() => onRequest(ad, false)}
        disabled={disabled}
        className={cn(
          ADMIN_ROW_ACTION_BASE,
          "border-zinc-500/55 bg-zinc-900/80 text-zinc-100 hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:ring-primary/35",
        )}
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        {t("p8.admin.common.remove_featured")}
      </button>
    );
  }
  if (ad.status === "approved") {
    return (
      <button
        type="button"
        onClick={() => onRequest(ad, true)}
        disabled={disabled}
        className={cn(
          ADMIN_ROW_ACTION_BASE,
          "border-primary/45 bg-primary/12 text-primary hover:border-primary/60 hover:bg-primary/20 focus-visible:ring-primary/40",
        )}
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        {t("p8.admin.common.feature")}
      </button>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <button
            type="button"
            disabled
            className={cn(
              ADMIN_ROW_ACTION_BASE,
              "cursor-not-allowed border-zinc-700/80 bg-zinc-900/60 text-zinc-500 opacity-70",
            )}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t("p8.admin.common.feature")}
          </button>
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-[260px] border border-primary/35 bg-zinc-950 px-3 py-2 text-xs leading-relaxed text-foreground shadow-lg"
      >
        {t("p8.admin.ads.featured_tooltip")}
      </TooltipContent>
    </Tooltip>
  );
}

export type AdminAdsTableRowProps = {
  ad: AdminAd;
  actionBusy: boolean;
  onOpenDetails: (ad: AdminAd) => void;
  onApprove: (id: number) => void;
  onReject: (ad: AdminAd) => void;
  onHide: (id: number) => void;
  onFeaturedRequest: (ad: AdminAd, nextFeatured: boolean) => void;
  onDelete: (ad: AdminAd) => void;
};

function AdminAdsTableRowInner({
  ad,
  actionBusy,
  onOpenDetails,
  onApprove,
  onReject,
  onHide,
  onFeaturedRequest,
  onDelete,
}: AdminAdsTableRowProps) {
  const numberLocale = getLocale() === "ar" ? "ar-EG" : getLocale() === "de" ? "de-DE" : "en-US";

  return (
    <tr className={cn(ADMIN_TABLE_ROW, "last:border-0")}>
      <td className="px-3 py-3 align-middle tabular-nums text-muted-foreground">{ad.id}</td>
      <td className="px-3 py-3 align-middle">
        <p className="line-clamp-1 font-medium text-foreground">{ad.title}</p>
        <p className="text-xs text-muted-foreground">{ad.categoryName || t("p8.admin.common.no_category")}</p>
      </td>
      <td className="px-3 py-3 align-middle">{ad.city}</td>
      <td className="px-3 py-3 align-middle tabular-nums">
        {ad.price === null ? t("p8.admin.common.price_unset") : `${ad.price} €`}
      </td>
      <td className="px-3 py-3 align-middle">
        <span
          className={cn(
            "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
            statusBadgeClass(ad.status),
          )}
        >
          {statusLabel(ad.status)}
        </span>
      </td>
      <td className="px-3 py-3 align-middle">
        {ad.slaState ? (
          <SlaStatusBadge state={ad.slaState} minutesRemaining={ad.slaMinutesRemaining} />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-3 py-3 align-middle">
        <FeaturedStripBadge featured={ad.featured} />
      </td>
      <td className="px-3 py-3 align-middle tabular-nums text-primary">{ad.views.toLocaleString(numberLocale)}</td>
      <td className="px-3 py-3 align-middle">
        <div className="flex flex-wrap justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onOpenDetails(ad)}
            className={cn(
              ADMIN_ROW_ACTION_BASE,
              "border-primary/40 bg-primary/10 text-primary hover:border-primary/55 hover:bg-primary/18 focus-visible:ring-primary/40",
            )}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden />
            {t("p8.admin.common.details")}
          </button>
          <button
            type="button"
            onClick={() => onApprove(ad.id)}
            disabled={actionBusy}
            className={cn(
              ADMIN_ROW_ACTION_BASE,
              "border-emerald-500/45 bg-emerald-600/15 text-emerald-200 hover:bg-emerald-600/25 focus-visible:ring-emerald-500/40",
            )}
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
            {t("p8.admin.common.approve")}
          </button>
          <button
            type="button"
            onClick={() => onReject(ad)}
            disabled={actionBusy}
            className={cn(
              ADMIN_ROW_ACTION_BASE,
              "border-orange-500/45 bg-orange-600/12 text-orange-100 hover:bg-orange-600/22 focus-visible:ring-orange-500/35",
            )}
          >
            <XCircle className="h-3.5 w-3.5" aria-hidden />
            {t("p8.admin.common.reject")}
          </button>
          <button
            type="button"
            onClick={() => onHide(ad.id)}
            disabled={actionBusy}
            className={cn(
              ADMIN_ROW_ACTION_BASE,
              "border-zinc-600 bg-zinc-800/90 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800 focus-visible:ring-zinc-500/40",
            )}
          >
            <EyeOff className="h-3.5 w-3.5" aria-hidden />
            {t("p8.admin.common.hide")}
          </button>
          <FeaturedToggleButtons ad={ad} disabled={actionBusy} onRequest={onFeaturedRequest} />
          <button
            type="button"
            onClick={() => onDelete(ad)}
            disabled={actionBusy}
            className={cn(
              ADMIN_ROW_ACTION_BASE,
              "border-red-500/45 bg-red-950/40 text-red-200 hover:border-red-400/55 hover:bg-red-950/60 focus-visible:ring-red-500/40",
            )}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            {t("p8.admin.common.delete")}
          </button>
        </div>
      </td>
    </tr>
  );
}

export const AdminAdsTableRow = memo(AdminAdsTableRowInner);
