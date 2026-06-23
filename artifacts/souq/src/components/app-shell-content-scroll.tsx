import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  APP_SHELL_CONTENT_SCROLL_CLASS,
  APP_SHELL_CONTENT_SCROLL_MARKER,
  APP_SHELL_CONTENT_SCROLL_VALUE,
} from "@/lib/app-shell-layout";

type AppShellContentScrollProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  className?: string;
};

/** P9-3 L2 scroll surface — single vertical scroll owner per route. */
export const AppShellContentScroll = forwardRef<HTMLDivElement, AppShellContentScrollProps>(
  function AppShellContentScroll({ children, className, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={cn(APP_SHELL_CONTENT_SCROLL_CLASS, className)}
        {...{ [APP_SHELL_CONTENT_SCROLL_MARKER]: APP_SHELL_CONTENT_SCROLL_VALUE }}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
