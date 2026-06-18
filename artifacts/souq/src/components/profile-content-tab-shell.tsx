import type { ReactNode } from "react";
import { ProfileSegmentTabBar } from "@/components/profile-segment-tab-bar";
import { profileSectionClassName } from "@/components/profile-section-shell";
import { cn } from "@/lib/utils";

export type ProfileContentTab = "my-ads" | "favorites" | "public";

type ProfileContentTabShellProps = {
  tabs: { value: ProfileContentTab; label: string }[];
  value: ProfileContentTab;
  onChange: (value: ProfileContentTab) => void;
  ariaLabel: string;
  dir: "rtl" | "ltr";
  className?: string;
  /** P9-PROFILE-FIXED-LAYOUT — tab panel owns vertical scroll; tabs stay pinned above. */
  panelScrollable?: boolean;
  children?: ReactNode;
};

/** Ads section shell — tabs as header, content flush below (single premium card) */
export function ProfileContentTabShell({
  tabs,
  value,
  onChange,
  ariaLabel,
  dir,
  className,
  panelScrollable = false,
  children,
}: ProfileContentTabShellProps) {
  return (
    <section
      dir={dir}
      className={profileSectionClassName(
        cn(
          "overflow-hidden",
          panelScrollable && "flex min-h-0 flex-1 flex-col",
          className,
        ),
      )}
      data-testid="profile-content-tab-shell"
    >
      <ProfileSegmentTabBar
        tabs={tabs}
        value={value}
        onChange={onChange}
        columns={3}
        ariaLabel={ariaLabel}
        className="shrink-0 border-b border-primary/20 px-2 pt-2 pb-1 md:px-2.5"
        withBorderBottom={false}
      />
      <div
        role="tabpanel"
        data-testid={panelScrollable ? "profile-content-tab-panel-scroll" : undefined}
        className={cn(
          "px-2 pb-2 pt-1.5 md:px-2.5 md:pb-2.5 md:pt-2",
          panelScrollable &&
            "min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]",
        )}
      >
        {children}
      </div>
    </section>
  );
}
