import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  APP_SHELL_CONTENT_SCROLL_CLASS,
  APP_SHELL_CONTENT_SCROLL_MARKER,
  APP_SHELL_CONTENT_SCROLL_VALUE,
} from "@/lib/app-shell-layout";

type AppShellContentScrollProps = {
  children: ReactNode;
  className?: string;
};

/** P9-3 L2 scroll surface — single vertical scroll owner per route. */
export function AppShellContentScroll({ children, className }: AppShellContentScrollProps) {
  return (
    <div
      className={cn(APP_SHELL_CONTENT_SCROLL_CLASS, className)}
      {...{ [APP_SHELL_CONTENT_SCROLL_MARKER]: APP_SHELL_CONTENT_SCROLL_VALUE }}
    >
      {children}
    </div>
  );
}
