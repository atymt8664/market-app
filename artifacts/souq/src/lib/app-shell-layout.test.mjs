/**
 * P9-3-IMPL Phase 1 — App Shell layout contract unit checks.
 */
import {
  APP_SHELL_CONTENT_SLOT_CLASS,
  APP_SHELL_LAYER,
  APP_SHELL_ROOT_CLASS,
  APP_SHELL_TAB_ROUTES,
} from "./app-shell-layout.ts";
import { BOTTOM_NAV_LAYOUT_FRAME_CLASS } from "./bottom-nav-layout.ts";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(APP_SHELL_LAYER.L2_CONTENT === "L2", "L2 id");
assert(APP_SHELL_LAYER.L3_BOTTOM_NAV === "L3", "L3 id");
assert(
  BOTTOM_NAV_LAYOUT_FRAME_CLASS === APP_SHELL_CONTENT_SLOT_CLASS,
  "L2 frame single SSOT",
);
assert(APP_SHELL_TAB_ROUTES.includes("/"), "tab routes include home");
assert(APP_SHELL_ROOT_CLASS.includes("flex-1"), "shell root flex");
assert(APP_SHELL_CONTENT_SLOT_CLASS.includes("max-w-screen-2xl"), "content max width");

console.log("p9-3-impl-p1 app-shell-layout: PASS");
