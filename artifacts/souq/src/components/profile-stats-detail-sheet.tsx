import type { ReactNode } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

const sheetSurface =
  "rounded-t-[1.25rem] border-x border-t border-primary/35 bg-zinc-950/[0.98] shadow-[0_0_32px_-12px_hsl(var(--primary)/0.28)] ring-1 ring-primary/15 max-h-[88vh]";

export function ProfileStatsDetailSheet({
  open,
  onOpenChange,
  title,
  children,
  dir = "rtl",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  dir?: "rtl" | "ltr";
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent dir={dir} className={cn(sheetSurface, "px-0 pb-6 pt-0")}>
        <DrawerHeader className={cn("px-4 pb-2 pt-1 text-center sm:text-center", dir === "rtl" && "text-right")}>
          <DrawerTitle className="text-base font-bold leading-snug text-foreground">{title}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 text-sm leading-relaxed text-muted-foreground">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
