import { Ban, BellOff, ListX, MoreVertical, X } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { t } from "@/i18n";
import { getAppTextDir } from "@/lib/app-text-direction";
import { cn } from "@/lib/utils";

export type InboxCollectionKind = "hidden" | "blocked" | "muted";

const SHEET_SHELL =
  "flex max-h-[min(90dvh,720px)] flex-col gap-0 rounded-t-2xl border-t border-primary/35 bg-[#0A0A0A] p-0 shadow-[0_-12px_48px_-16px_rgba(0,0,0,0.55)] ring-1 ring-primary/20 sm:mx-auto sm:max-w-lg";

const MENU_ROW =
  "flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-[#0A0A0A]/90 px-4 py-3.5 text-start shadow-[0_0_16px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/12 transition-colors hover:border-primary/48 hover:bg-black/92 active:scale-[0.99]";

type ChatInboxCollectionsMenuProps = {
  open: boolean;
  hiddenCount: number;
  blockedCount: number;
  mutedCount: number;
  onOpenChange: (open: boolean) => void;
  onSelect: (kind: InboxCollectionKind) => void;
};

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex h-6 min-w-[1.5rem] shrink-0 items-center justify-center rounded-full bg-primary/20 px-2 text-[11px] font-bold tabular-nums text-primary ring-1 ring-primary/25">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function ChatInboxCollectionsMenu({
  open,
  hiddenCount,
  blockedCount,
  mutedCount,
  onOpenChange,
  onSelect,
}: ChatInboxCollectionsMenuProps) {
  const textDir = getAppTextDir();
  const items: { kind: InboxCollectionKind; icon: typeof ListX; label: string; count: number }[] =
    [
      {
        kind: "hidden",
        icon: ListX,
        label: t("p5.chat.collections.menu_hidden"),
        count: hiddenCount,
      },
      {
        kind: "blocked",
        icon: Ban,
        label: t("p5.chat.collections.menu_blocked"),
        count: blockedCount,
      },
      {
        kind: "muted",
        icon: BellOff,
        label: t("p5.chat.collections.menu_muted"),
        count: mutedCount,
      },
    ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" hideClose className={SHEET_SHELL}>
        <div
          className="flex shrink-0 items-center justify-between gap-3 border-b border-primary/20 px-4 pb-3 pt-4"
          dir={textDir}
        >
          <SheetTitle className="m-0 flex-1 text-start text-base font-semibold text-white">
            {t("p5.chat.collections.menu_title")}
          </SheetTitle>
          <SheetClose asChild>
            <button
              type="button"
              aria-label={t("p5.chat.collections.menu_close")}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/45 bg-[#0A0A0A]/90 text-primary transition-colors hover:border-primary/65 hover:bg-black/30"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </SheetClose>
        </div>
        <SheetDescription className="sr-only">{t("p5.chat.collections.menu_title")}</SheetDescription>
        <div
          className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3"
          dir={textDir}
        >
          {items.map(({ kind, icon: Icon, label, count }) => (
            <button
              key={kind}
              type="button"
              className={MENU_ROW}
              onClick={() => {
                onOpenChange(false);
                onSelect(kind);
              }}
            >
              <Icon className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} aria-hidden />
              <span className="flex-1 text-sm font-semibold text-white">{label}</span>
              <CountBadge count={count} />
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function ChatInboxCollectionsMenuButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("p5.chat.collections.menu_aria")}
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/35 bg-[#0A0A0A]/85 text-primary shadow-[0_0_16px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/12 transition-colors hover:border-primary/52 hover:bg-black/95",
      )}
    >
      <MoreVertical className="h-5 w-5" strokeWidth={2.25} aria-hidden />
    </button>
  );
}
