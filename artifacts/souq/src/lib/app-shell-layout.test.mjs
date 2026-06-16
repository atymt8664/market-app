/**
 * P9-3-IMPL — App Shell layout contract unit checks.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  APP_SHELL_CONTENT_SLOT_CLASS,
  APP_SHELL_CONTENT_SCROLL_CLASS,
  APP_SHELL_HEADER_SLOT_CLASS,
  APP_SHELL_LAYER,
  APP_SHELL_ROOT_CLASS,
  APP_SHELL_TAB_ROUTES,
} from "./app-shell-layout.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bottomNavSrc = readFileSync(path.join(__dirname, "bottom-nav-layout.ts"), "utf8");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(APP_SHELL_LAYER.L2_CONTENT === "L2", "L2 id");
assert(APP_SHELL_LAYER.L1_HEADER === "L1", "L1 id");
assert(APP_SHELL_LAYER.L3_BOTTOM_NAV === "L3", "L3 id");
assert(APP_SHELL_TAB_ROUTES.includes("/"), "tab routes include home");
assert(APP_SHELL_ROOT_CLASS.includes("flex-1"), "shell root flex");
assert(APP_SHELL_CONTENT_SLOT_CLASS.includes("overflow-hidden"), "L2 frame must not scroll");
assert(APP_SHELL_CONTENT_SCROLL_CLASS.includes("overflow-y-auto"), "L2 scroll surface");
assert(APP_SHELL_CONTENT_SCROLL_CLASS.includes("overscroll-y-contain"), "L2 rubber-band contain");
assert(APP_SHELL_HEADER_SLOT_CLASS.includes("shrink-0"), "L1 header slot shrink-0");
assert(
  !/BOTTOM_NAV_SCROLL_END_SPACER_CLASS[\s\S]*souq-safe-bottom/.test(bottomNavSrc),
  "scroll spacer must not include safe-bottom",
);

console.log("p9-3-impl app-shell-layout: PASS");
