import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/i18n";
import { appTextAlignClass, getAppTextDir } from "@/lib/app-text-direction";
import {
  inboxCollectionBackBtnClass,
  inboxCollectionCountBadge,
  inboxCollectionEmptyCardClass,
  inboxCollectionHeaderClass,
  inboxCollectionListGapClass,
  inboxCollectionListWrapClass,
  inboxCollectionPageTitleBadge,
  inboxCollectionShellClass,
  inboxCollectionSkeletonRowClass,
} from "@/lib/chat-inbox-collection-styles";
import {
  TAB_PAGE_HEADER_ACTION_ICON,
  TAB_PAGE_HEADER_COMPACT_PADDING,
  TAB_PAGE_HEADER_INNER_ROW,
} from "@/lib/tab-page-header-styles";
import { cn } from "@/lib/utils";
import { BOTTOM_NAV_SCROLL_END_SPACER_CLASS } from "@/lib/bottom-nav-layout";

type ChatInboxCollectionShellProps = {
  title: string;
  count?: number;
  loading: boolean;
  empty: boolean;
  emptyIcon: ReactNode;
  emptyTitle: string;
  emptyDesc: string;
  onBack: () => void;
  children: ReactNode;
};

export function ChatInboxCollectionShell({
  title,
  count,
  loading,
  empty,
  emptyIcon,
  emptyTitle,
  emptyDesc,
  onBack,
  children,
}: ChatInboxCollectionShellProps) {
  const textDir = getAppTextDir();
  const textAlign = appTextAlignClass();
  const showSkeleton = loading && empty;
  const showEmpty = !loading && empty;
  const showList = !showSkeleton && !showEmpty;

  return (
    <div className={inboxCollectionShellClass}>
      <header className={inboxCollectionHeaderClass} dir={textDir}>
        <div className={cn(TAB_PAGE_HEADER_INNER_ROW, "max-w-[820px]", TAB_PAGE_HEADER_COMPACT_PADDING)}>
          <button
            type="button"
            onClick={onBack}
            aria-label={t("p5.chat.collections.back_aria")}
            className={inboxCollectionBackBtnClass}
          >
            <ArrowRight
              className={cn(TAB_PAGE_HEADER_ACTION_ICON, textDir === "ltr" && "rotate-180")}
              strokeWidth={2.25}
              aria-hidden
            />
          </button>
          <div className={cn("flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-0.5", textAlign)}>
            <h1 className="m-0 inline-flex min-w-0 flex-wrap items-center">
              <span className={inboxCollectionPageTitleBadge}>{title}</span>
              {typeof count === "number" && count > 0 ? (
                <span className={inboxCollectionCountBadge} aria-label={t("p5.chat.collections.count_label", { count })}>
                  {count > 99 ? "99+" : count}
                </span>
              ) : null}
            </h1>
          </div>
        </div>
      </header>

      <div className={inboxCollectionListWrapClass}>
        {showSkeleton ? (
          <div className={inboxCollectionListGapClass}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className={inboxCollectionSkeletonRowClass} />
            ))}
          </div>
        ) : showEmpty ? (
          <div className="flex w-full justify-center pt-2">
            <div
              className={cn(
                inboxCollectionEmptyCardClass,
                "flex w-full max-w-md flex-col items-center text-center",
              )}
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-primary/35 bg-[#0A0A0A] shadow-[0_0_18px_-8px_hsl(var(--primary)/0.22)] ring-1 ring-primary/12">
                {emptyIcon}
              </div>
              <h2 className="mb-1 text-base font-bold text-foreground">{emptyTitle}</h2>
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{emptyDesc}</p>
            </div>
          </div>
        ) : showList ? (
          <div className={inboxCollectionListGapClass}>
            {children}
            <div aria-hidden className={cn(BOTTOM_NAV_SCROLL_END_SPACER_CLASS)} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
