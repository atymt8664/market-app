import { ChevronLeft } from "lucide-react";
import { t } from "@/i18n";
import {
  SETTINGS_CARD_SHELL,
  SETTINGS_HUB_ICON_TILE,
  SETTINGS_HUB_LIST_ROW,
  SETTINGS_HUB_LIST_ROW_HINT,
  SETTINGS_HUB_LIST_ROW_LABEL,
  SETTINGS_HUB_LIST_ROW_PAD,
  SETTINGS_HUB_SECTION_TITLE,
  SETTINGS_ICON_TILE_DESTRUCTIVE,
} from "@/components/settings-shell";

export const SETTINGS_ROW_DIVIDER = "border-primary/10";

export interface SettingsHubRowProps {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick?: () => void;
  trailing?: React.ReactNode;
  destructive?: boolean;
  soon?: boolean;
  className?: string;
  iconClassName?: string;
  labelClassName?: string;
  hintClassName?: string;
  /** When 2, allows up to two compact hint lines instead of single-line truncate. */
  hintLineClamp?: 1 | 2;
  dividerClassName?: string;
}

export function SettingsHubRow({
  icon,
  label,
  hint,
  onClick,
  trailing,
  destructive,
  soon,
  className,
  iconClassName,
  labelClassName,
  hintClassName,
  hintLineClamp = 1,
  dividerClassName,
}: SettingsHubRowProps) {
  const rowHint = soon ? t("settings.common.coming_soon") : hint;
  const hintLayoutClass =
    hintLineClamp === 2
      ? "w-full whitespace-normal line-clamp-2"
      : "truncate";
  return (
    <button
      type="button"
      onClick={soon ? undefined : onClick}
      disabled={soon}
      aria-disabled={soon || undefined}
      className={`${SETTINGS_HUB_LIST_ROW} ${SETTINGS_HUB_LIST_ROW_PAD} ${soon ? "cursor-default opacity-80" : ""} ${dividerClassName ?? ""} ${className ?? ""}`}
    >
      <div
        className={`${destructive ? SETTINGS_ICON_TILE_DESTRUCTIVE : SETTINGS_HUB_ICON_TILE} ${iconClassName ?? ""}`}
      >
        {icon}
      </div>
      <div className="flex-1 flex flex-col items-start min-w-0">
        <span
          className={`${destructive ? "text-destructive" : ""} ${labelClassName ?? SETTINGS_HUB_LIST_ROW_LABEL}`}
        >
          {label}
        </span>
        {rowHint && (
          <span className={`${hintLayoutClass} ${hintClassName ?? SETTINGS_HUB_LIST_ROW_HINT}`}>
            {rowHint}
          </span>
        )}
      </div>
      {!soon && (trailing ?? (
        <ChevronLeft className="w-4 h-4 text-primary/45 shrink-0" />
      ))}
    </button>
  );
}

export function SettingsHubSection({
  title,
  children,
  className,
  titleClassName,
  cardClassName,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
  cardClassName?: string;
}) {
  return (
    <section className={className ?? ""}>
      {title && (
        <h2 className={`${SETTINGS_HUB_SECTION_TITLE} ${titleClassName ?? ""}`}>
          {title}
        </h2>
      )}
      <div className={`${SETTINGS_CARD_SHELL} overflow-hidden ${cardClassName ?? ""}`}>
        {children}
      </div>
    </section>
  );
}
