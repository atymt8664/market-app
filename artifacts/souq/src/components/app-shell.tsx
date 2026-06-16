import type { ReactNode } from "react";
import {
  APP_SHELL_CONTENT_SLOT_CLASS,
  APP_SHELL_LAYER,
  APP_SHELL_LAYER_MARKER,
  APP_SHELL_ROOT_CLASS,
  APP_SHELL_ROOT_MARKER,
  APP_SHELL_ROOT_VALUE,
} from "@/lib/app-shell-layout";

type AppShellProps = {
  header?: ReactNode;
  children: ReactNode;
};

/**
 * P9-3 App Shell — chrome frame (L0 implicit · L1 header · L2 content).
 * L3 Bottom Nav: layout.tsx portal on document.body with data-app-shell-layer=L3.
 */
export function AppShell({ header, children }: AppShellProps) {
  return (
    <div className={APP_SHELL_ROOT_CLASS} {...{ [APP_SHELL_ROOT_MARKER]: APP_SHELL_ROOT_VALUE }}>
      {header}
      <div
        className={APP_SHELL_CONTENT_SLOT_CLASS}
        {...{ [APP_SHELL_LAYER_MARKER]: APP_SHELL_LAYER.L2_CONTENT }}
      >
        {children}
      </div>
    </div>
  );
}
