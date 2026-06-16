import type { ReactNode } from "react";
import { Heart, User } from "lucide-react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { TAB_IOS_STICKY_HEADER_SAFE_TOP_CLASS } from "@/lib/tab-ios-layout";
import { inboxCollectionPageTitleBadge } from "@/lib/chat-inbox-collection-styles";
import {
  APP_SHELL_HEADER_SLOT_CLASS,
  APP_SHELL_LAYER,
  APP_SHELL_LAYER_MARKER,
} from "@/lib/app-shell-layout";
import type { AppChromeRouteConfig } from "@/lib/app-chrome-route";
import type { AppChromePageOverride } from "@/contexts/app-chrome-context";
import { getAppTextDir, appTextAlignClass } from "@/lib/app-text-direction";

const tabTitleSectionHeading = cn(
  "inline-flex max-w-full w-fit items-center rounded-2xl border border-primary/35 bg-[#0A0A0A]/80 px-2 py-px",
  "text-sm font-semibold leading-tight tracking-tight text-foreground md:text-base",
  "shadow-[0_0_14px_-12px_hsl(var(--primary)/0.16)] ring-1 ring-primary/10 bg-[#0A0A0A]/70",
);

const tabTitlePageHeading = cn(
  tabTitleSectionHeading,
  "px-2.5 py-0.5 text-lg font-bold md:px-3 md:py-1 md:text-xl",
);

const tabTitleIconCircle = cn(
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
  "border border-primary/40 bg-[#0A0A0A]/75",
  "shadow-[0_0_22px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10",
  "text-primary transition-[border-color,box-shadow] duration-200",
);

const createAdTitleHeading = cn(
  tabTitleSectionHeading,
  "px-2.5 py-0.5 text-base font-semibold md:px-3 md:py-1 md:text-lg",
);

const createAdBackBtn =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/55 bg-black/55 text-primary shadow-[0_0_10px_-4px_hsl(var(--primary)/0.2)] transition-colors hover:border-primary/75 active:opacity-90";

type AppChromeHeaderProps = {
  route: AppChromeRouteConfig;
  override: AppChromePageOverride;
};

function TabTitleHeader({
  title,
  dir,
  maxWidthClass,
  icon,
  trailing,
  titleClassName,
  rowClassName,
}: {
  title: string;
  dir: "rtl" | "ltr";
  maxWidthClass: string;
  icon?: ReactNode;
  trailing?: ReactNode;
  titleClassName?: string;
  rowClassName?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-primary/20 bg-[#0A0A0A]/95 shadow-[0_1px_14px_-6px_rgba(0,0,0,0.4)]",
        "px-3 py-3 md:backdrop-blur md:px-4 md:py-3.5",
        TAB_IOS_STICKY_HEADER_SAFE_TOP_CLASS,
      )}
      dir={dir}
      data-app-chrome-header="tab-title"
    >
      <div
        className={cn(
          "mx-auto flex w-full items-center justify-between gap-3",
          maxWidthClass,
          rowClassName,
        )}
      >
        <h1
          className={cn(
            "m-0 flex min-w-0 flex-1 items-center gap-2 text-lg font-bold text-foreground md:text-xl",
            dir === "rtl" ? "text-right" : "text-start",
          )}
        >
          <span className={cn("min-w-0 flex-1", dir === "rtl" ? "text-right" : "text-start")}>
            <span className={titleClassName ?? tabTitlePageHeading}>{title}</span>
          </span>
          {icon ? <span aria-hidden>{icon}</span> : null}
        </h1>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>
    </header>
  );
}

function CreateAdBackTrailing() {
  return (
    <Link href="/" className="shrink-0">
      <button
        type="button"
        className={createAdBackBtn}
        aria-label={t("common.back")}
      >
        <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
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

  let icon: ReactNode;
  if (route.route === "favorites") {
    icon = (
      <span className={tabTitleIconCircle}>
        <Heart
          className="h-5 w-5 fill-primary text-primary md:h-6 md:w-6"
          strokeWidth={2.25}
        />
      </span>
    );
  } else if (route.route === "profile") {
    icon = (
      <span className={tabTitleIconCircle}>
        <User className="h-5 w-5 text-primary md:h-6 md:w-6" strokeWidth={2.25} />
      </span>
    );
  }

  if (route.route === "messages") {
    return (
      <header
        className={cn(
          "sticky top-0 z-40 border-b border-primary/20 bg-[#0A0A0A] shadow-[0_1px_14px_-6px_rgba(0,0,0,0.4)]",
          TAB_IOS_STICKY_HEADER_SAFE_TOP_CLASS,
        )}
        dir={getAppTextDir()}
        data-app-chrome-header="tab-title"
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-[820px] items-center justify-between gap-3 px-3 py-2.5 md:px-4",
          )}
        >
          <h1 className={cn("m-0 min-w-0 flex-1", appTextAlignClass())}>
            <span className={inboxCollectionPageTitleBadge}>{title}</span>
          </h1>
          {trailing}
        </div>
      </header>
    );
  }

  if (route.route === "create-ad") {
    return (
      <TabTitleHeader
        title={title}
        dir={route.dir}
        maxWidthClass={cn(route.maxWidthClass, "px-4 py-2 md:px-6 md:py-2.5")}
        titleClassName={createAdTitleHeading}
        trailing={trailing}
        rowClassName="px-0"
      />
    );
  }

  return (
    <TabTitleHeader
      title={title}
      dir={route.dir}
      maxWidthClass={route.maxWidthClass}
      icon={icon}
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
