import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import {
  TAB_PAGE_HEADER_ACTION_BTN_DARK,
  TAB_PAGE_HEADER_ACTION_ICON,
  TAB_PAGE_HEADER_COMPACT_OUTER,
  TAB_PAGE_HEADER_COMPACT_PADDING,
  TAB_PAGE_HEADER_COMPACT_PADDING_WIDE,
  TAB_PAGE_HEADER_INNER_ROW,
  TAB_PAGE_HEADER_TRAILING_WRAP_COMPACT,
  TAB_PAGE_HEADER_BAR,
  TAB_PAGE_TITLE_BADGE_COMPACT,
} from "@/lib/tab-page-header-styles";
import {
  APP_SHELL_HEADER_SLOT_CLASS,
  APP_SHELL_LAYER,
  APP_SHELL_LAYER_MARKER,
} from "@/lib/app-shell-layout";
import type { AppChromeRouteConfig } from "@/lib/app-chrome-route";
import type { AppChromePageOverride } from "@/contexts/app-chrome-context";

type AppChromeHeaderProps = {
  route: AppChromeRouteConfig;
  override: AppChromePageOverride;
};

function CompactTabTitleHeader({
  title,
  dir,
  maxWidthClass,
  trailing,
  titleClassName = TAB_PAGE_TITLE_BADGE_COMPACT,
}: {
  title: string;
  dir: "rtl" | "ltr";
  maxWidthClass: string;
  trailing?: ReactNode;
  titleClassName?: string;
}) {
  return (
    <header
      className={cn(TAB_PAGE_HEADER_BAR, TAB_PAGE_HEADER_COMPACT_OUTER)}
      dir={dir}
      data-app-chrome-header="tab-title"
    >
      <div className={cn(TAB_PAGE_HEADER_INNER_ROW, maxWidthClass)}>
        <h1
          className={cn(
            "m-0 flex min-w-0 flex-1 items-center gap-2 text-base font-semibold text-foreground md:text-lg",
            dir === "rtl" ? "text-right" : "text-start",
          )}
        >
          <span className={cn("min-w-0 flex-1", dir === "rtl" ? "text-right" : "text-start")}>
            <span className={titleClassName}>{title}</span>
          </span>
        </h1>
        {trailing ? (
          <div className={TAB_PAGE_HEADER_TRAILING_WRAP_COMPACT}>{trailing}</div>
        ) : null}
      </div>
    </header>
  );
}

function CreateAdBackTrailing() {
  return (
    <Link href="/" className="shrink-0">
      <button
        type="button"
        className={TAB_PAGE_HEADER_ACTION_BTN_DARK}
        aria-label={t("common.back")}
      >
        <ArrowRight className={TAB_PAGE_HEADER_ACTION_ICON} strokeWidth={2.25} />
      </button>
    </Link>
  );
}

export function AppChromeHeader({ route, override }: AppChromeHeaderProps) {
  if (route.kind !== "tab-title" || override.hidden) {
    return null;
  }

  const titleKey = override.titleKey ?? route.titleKey;
  const title = t(titleKey);
  const trailing =
    override.trailing ??
    (route.route === "create-ad" ? <CreateAdBackTrailing /> : undefined);

  const paddingClass =
    route.route === "create-ad"
      ? TAB_PAGE_HEADER_COMPACT_PADDING_WIDE
      : TAB_PAGE_HEADER_COMPACT_PADDING;

  return (
    <CompactTabTitleHeader
      title={title}
      dir={route.dir}
      maxWidthClass={cn(route.maxWidthClass, paddingClass)}
      trailing={trailing}
    />
  );
}

/** L1 mount plane — wraps AppChromeHeader with shell markers. */
export function AppChromeHeaderSlot({
  route,
  override,
}: AppChromeHeaderProps) {
  const chrome = <AppChromeHeader route={route} override={override} />;
  if (route.kind === "none" || override.hidden) {
    return null;
  }

  return (
    <div
      className={APP_SHELL_HEADER_SLOT_CLASS}
      {...{ [APP_SHELL_LAYER_MARKER]: APP_SHELL_LAYER.L1_HEADER }}
    >
      {chrome}
    </div>
  );
}
