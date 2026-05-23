import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";

export type CreateAdImproveProposal = {
  title: string;
  description: string;
};

export type CreateAdImproveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  original: CreateAdImproveProposal;
  proposal: CreateAdImproveProposal | null;
  isLoading: boolean;
  onApply: () => void;
};

export function CreateAdImproveDialog({
  open,
  onOpenChange,
  original,
  proposal,
  isLoading,
  onApply,
}: CreateAdImproveDialogProps) {
  const { locale } = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";

  const titleChanged =
    proposal != null &&
    proposal.title.trim() !== original.title.trim() &&
    proposal.title.trim().length > 0;
  const descChanged =
    proposal != null &&
    proposal.description.trim() !== original.description.trim() &&
    proposal.description.trim().length > 0;
  const hasChanges = titleChanged || descChanged;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(92dvh,640px)] w-[calc(100vw-1.5rem)] max-w-md flex-col gap-0 overflow-hidden border-primary/35 bg-[#0A0A0A] p-0 shadow-2xl ring-1 ring-primary/20 sm:max-w-lg sm:rounded-2xl",
        )}
        dir={dir}
      >
        <DialogHeader className="shrink-0 border-b border-primary/20 px-4 py-3 text-start">
          <DialogTitle className="text-base font-bold text-white">
            {t("create_ad.ai.preview_title")}
          </DialogTitle>
          <p className="mt-1 text-xs text-zinc-400">
            {t("create_ad.ai.preview_subtitle")}
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3">
          {isLoading ? (
            <p className="py-6 text-center text-sm text-zinc-400">
              {t("create_ad.ai.preview_loading")}
            </p>
          ) : proposal ? (
            <>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-zinc-500">
                  {t("create_ad.ai.preview_title_label")}
                </p>
                <div className="rounded-xl border border-primary/25 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-400 line-through decoration-zinc-600">
                  {original.title.trim() || "—"}
                </div>
                {titleChanged ? (
                  <div className="rounded-xl border border-primary/40 bg-primary/5 px-3 py-2 text-sm font-medium text-foreground ring-1 ring-primary/15">
                    {proposal.title}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">{t("create_ad.ai.preview_unchanged")}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-zinc-500">
                  {t("create_ad.ai.preview_description_label")}
                </p>
                <div className="rounded-xl border border-primary/25 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-400 whitespace-pre-wrap line-through decoration-zinc-600 max-h-24 overflow-y-auto">
                  {original.description.trim() || "—"}
                </div>
                {descChanged ? (
                  <div className="rounded-xl border border-primary/40 bg-primary/5 px-3 py-2 text-sm leading-relaxed text-foreground whitespace-pre-wrap ring-1 ring-primary/15 max-h-40 overflow-y-auto">
                    {proposal.description}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">{t("create_ad.ai.preview_unchanged")}</p>
                )}
              </div>

              {!hasChanges ? (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
                  {t("create_ad.ai.description_unchanged_hint")}
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-primary/20 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className="h-11 w-full rounded-full border border-primary/45 bg-zinc-950/80 text-base font-bold text-primary shadow-[0_0_16px_-12px_hsl(var(--primary)/0.35)] hover:border-primary/60 hover:bg-zinc-900/90"
              disabled={isLoading || !hasChanges}
              onClick={onApply}
            >
              {t("create_ad.ai.preview_apply")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-full border-primary/40 bg-zinc-950/80 text-base font-semibold text-foreground hover:border-primary/55 hover:bg-zinc-900/90"
              disabled={isLoading}
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
