import { useLocation } from "wouter";
import { AppChromeHeaderSlot } from "@/components/app-chrome-header";
import { useAppChromeContext } from "@/contexts/app-chrome-context";
import { resolveAppChromeRoute } from "@/lib/app-chrome-route";
import {
  APP_SHELL_HEADER_SLOT_CLASS,
  APP_SHELL_LAYER,
  APP_SHELL_LAYER_MARKER,
} from "@/lib/app-shell-layout";

/** L1 header bridge — Home L1 chrome or tab-title resolver. */
export function AppChromeHeaderBridge() {
  const [location] = useLocation();
  const { override, homeL1Chrome } = useAppChromeContext();

  if (location === "/") {
    if (!homeL1Chrome) return null;
    return (
      <div
        className={APP_SHELL_HEADER_SLOT_CLASS}
        {...{ [APP_SHELL_LAYER_MARKER]: APP_SHELL_LAYER.L1_HEADER }}
      >
        {homeL1Chrome}
      </div>
    );
  }

  const route = resolveAppChromeRoute(location);
  return <AppChromeHeaderSlot route={route} override={override} />;
}
