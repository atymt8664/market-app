import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** شبكة موحّدة: صف واحد من أربعة كروت (موبايل + سطح المكتب) */
export const PROFILE_STATS_GRID =
  "grid grid-cols-4 gap-1.5 text-center md:gap-2";

/** كرت إحصائية واحد — حجم ولمعان وبُعد موحّد مع بروفايل الإعلانات */
export const profileStatTileShell =
  "flex min-h-[5rem] w-full min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border border-primary/35 bg-[#0A0A0A]/75 px-1 py-2.5 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 md:min-h-[5.25rem] md:gap-1.5 md:px-2";

export const profileStatTileInteractive =
  "cursor-pointer transition-[transform,box-shadow,border-color] hover:border-primary/48 hover:shadow-[0_0_26px_-10px_hsl(var(--primary)/0.22)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35";

export function ProfileStatTile({
  icon,
  value,
  label,
  onClick,
  disabled,
  numberLocale = "ar",
}: {
  icon: ReactNode;
  value: number;
  label: string;
  /** بدون onClick = غير تفاعلي (مثل إجمالي الإعلانات) */
  onClick?: () => void;
  disabled?: boolean;
  /** لعرض الأرقام حسب لغة الواجهة */
  numberLocale?: string;
}) {
  const interactive = Boolean(onClick) && !disabled;
  const interactiveTile = profileStatTileInteractive;
  const formatted = value.toLocaleString(numberLocale);

  if (!interactive) {
    return (
      <div className={cn(profileStatTileShell, "select-none")}>
        <div className="flex h-5 w-5 shrink-0 items-center justify-center text-primary [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </div>
        <p className="text-base font-bold tabular-nums leading-none text-foreground md:text-lg">
          {formatted}
        </p>
        <p className="max-w-[100%] truncate px-0.5 text-[9px] font-medium leading-tight text-muted-foreground md:text-[10px]">
          {label}
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${label}: ${formatted}`}
      className={cn(profileStatTileShell, interactiveTile, disabled && "pointer-events-none opacity-60")}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-primary [&_svg]:h-5 [&_svg]:w-5">
        {icon}
      </span>
      <span className="text-base font-bold tabular-nums leading-none text-foreground md:text-lg">
        {formatted}
      </span>
      <span className="max-w-[100%] truncate px-0.5 text-[9px] font-medium leading-tight text-muted-foreground md:text-[10px]">
        {label}
      </span>
    </button>
  );
}
