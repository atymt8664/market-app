import { cn } from "@/lib/utils";
import {
  PROFILE_SEGMENT_TAB_ACTIVE,
  PROFILE_SEGMENT_TAB_BASE,
  PROFILE_SEGMENT_TAB_INACTIVE,
  PROFILE_SEGMENT_TAB_LIST_3,
  PROFILE_SEGMENT_TAB_LIST_4,
} from "@/components/profile-section-shell";

export type ProfileSegmentTabItem<T extends string> = {
  value: T;
  label: string;
};

type ProfileSegmentTabBarProps<T extends string> = {
  tabs: ProfileSegmentTabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  columns: 3 | 4;
  ariaLabel: string;
  className?: string;
  withBorderBottom?: boolean;
};

export function ProfileSegmentTabBar<T extends string>({
  tabs,
  value,
  onChange,
  columns,
  ariaLabel,
  className,
  withBorderBottom = true,
}: ProfileSegmentTabBarProps<T>) {
  const listClass = columns === 4 ? PROFILE_SEGMENT_TAB_LIST_4 : PROFILE_SEGMENT_TAB_LIST_3;

  return (
    <div
      className={cn(listClass, withBorderBottom && "border-b border-primary/20", className)}
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
        const active = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              PROFILE_SEGMENT_TAB_BASE,
              active ? PROFILE_SEGMENT_TAB_ACTIVE : PROFILE_SEGMENT_TAB_INACTIVE,
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
