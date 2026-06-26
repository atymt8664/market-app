/**
 * Sync home-critical gate locale fragments from full dictionaries (P7-PR-3).
 * Run: node scripts/sync-home-gate-locales.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localesDir = path.join(__dirname, "..", "src", "i18n", "locales");

/** Home cold-path + BottomNav + featured AdCard + search bar (L7 gate). */
export const HOME_GATE_KEYS = [
  "language.option.ar",
  "language.option.en",
  "language.option.de",
  "first_launch.title",
  "first_launch.subtitle",
  "first_launch.recommended",
  "first_launch.note",
  "first_launch.confirm",
  "home.view_all",
  "home.featured_ads",
  "home.no_featured_ads",
  "home.recommended",
  "home.no_ads",
  "home.new_ads_banner_many",
  "home.new_ads_banner_one",
  "home.search_placeholder",
  "home.search_label",
  "home.section_load_failed",
  "home.retry",
  "bottom_nav.home",
  "bottom_nav.favorites",
  "bottom_nav.post",
  "bottom_nav.messages",
  "bottom_nav.account",
  "bottom_nav.login_required_title",
  "bottom_nav.login_required_create",
  "bottom_nav.login_required_messages",
  "bottom_nav.login_required_favorites",
  "bottom_nav.login_required_profile",
  "bottom_nav.login_required_default",
  "favorites.title",
  "messages.title",
  "create_ad.create_title",
  "create_ad.edit_title",
  "profile.title",
  "common.back",
  "ad-card.negotiable",
  "ad-card.fixed_price",
  "ad-card.free",
  "ad-card.swap",
  "ad-card.remove_favorite",
  "ad-card.add_favorite",
  "ad-card.unknown_city",
  "ad-card.unknown_price",
  "ad-card.no_image",
  "search_location.open_picker",
  "search_location.current_place",
  "search_location.bar_label",
  "search_location.default_country",
  "search_location.title",
  "search_location.search_placeholder",
  "search_location.use_my_location",
  "search_location.radius_value",
  "search_location.km_tick",
  "search_location.apply",
  "search_location.close",
  "search_location.searching",
  "search_location.no_results",
  "search_location.map_loading",
  "search_location.radius_decrease",
  "search_location.radius_increase",
  "search_location.radius_aria",
  "search_location.gps_denied",
  "search_location.gps_failed",
  "search_location.gps_insecure",
  "search_location.gps_timeout",
  "search_location.gps_unsupported",
  "notifications.bell_aria",
  "p17.notifications.permission_title",
  "p17.notifications.permission_body",
  "p17.notifications.permission_bullet_messages",
  "p17.notifications.permission_bullet_orders",
  "p17.notifications.permission_bullet_reports",
  "p17.notifications.permission_enable",
  "p17.notifications.permission_not_now",
  "p5.chat.inbox.clear_selection",
  "p5.chat.inbox.last_seen_prefix",
  "p5.chat.inbox.online",
  "p5.chat.inbox.select_all",
  "p5.chat.inbox.selection_count",
  // PLS-1: guest-welcome + auth validation — sync before full locale async load
  "auth.shared.welcome_brand",
  "auth.shared.welcome_desc",
  "auth.guest.sign_in_first",
  "auth.guest.context.create_ad",
  "auth.guest.context.default",
  "auth.guest.context.favorites",
  "auth.guest.context.messages",
  "auth.guest.context.profile",
  "auth.login.submit",
  "auth.signup.submit",
  "auth.validation.accept_privacy_required",
  "auth.validation.accept_terms_required",
  "auth.validation.city_required",
  "auth.validation.confirm_password_required",
  "auth.validation.country_required",
  "auth.validation.first_name_required",
  "auth.validation.invalid_email",
  "auth.validation.invalid_phone",
  "auth.validation.last_name_required",
  "auth.validation.password_policy",
  "auth.validation.password_required",
  "auth.validation.password_short",
  "auth.validation.passwords_mismatch",
];

for (const locale of ["ar", "en", "de"]) {
  const full = JSON.parse(readFileSync(path.join(localesDir, `${locale}.json`), "utf8"));
  const gate = {};
  for (const key of HOME_GATE_KEYS) {
    if (!(key in full)) throw new Error(`Missing ${key} in ${locale}.json`);
    gate[key] = full[key];
  }
  writeFileSync(
    path.join(localesDir, "gate", `${locale}.json`),
    `${JSON.stringify(gate, null, 2)}\n`,
    "utf8",
  );
  console.log(`[P7-PR-3] gate/${locale}.json — ${Object.keys(gate).length} keys`);
}
