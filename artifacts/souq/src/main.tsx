import { createRoot } from "react-dom/client";
/** P7-PR-7: sync critical CSS only — full index.css deferred after first paint. */
import "./home-critical.css";
import { ensureBootstrapLocales, hasSavedLocale } from "@/i18n";
import { getApiBaseUrl } from "@/lib/api-url";
import { setBaseUrl } from "@workspace/api-client-react";
import { queryClient } from "@/lib/query-client";
import { installAccountDisabledFetchInterceptor } from "@/lib/account-disabled-interceptor";
import { scheduleDeferredFonts } from "@/lib/deferred-fonts";
import { scheduleDeferredStyles } from "@/lib/deferred-styles";
import { scheduleAfterFirstPaint } from "@/lib/after-first-paint";
import { registerProductionServiceWorker } from "@/lib/register-production-service-worker";
import { initWebVitalsReporting } from "@/lib/web-vitals-reporting";
import {
  startHomeLcpPrefetch,
  startHomeRecommendedPrefetch,
  wireHomeLcpPrefetchToQueryClient,
} from "@/lib/home-lcp-prefetch";
import { installStandaloneSafeAreaListeners } from "@/lib/standalone-safe-area";
import { isHomePathname } from "@/lib/p7-home-path";

const apiBase = getApiBaseUrl();
setBaseUrl(apiBase || null);

installStandaloneSafeAreaListeners();

installAccountDisabledFetchInterceptor(queryClient);

/** P7-PR-9: featured API prefetch on Home — seeds React Query (shell dismissed when feed mounts). */
/** P9-2: skip Home warm path while first-launch language gate is active. */
if (isHomePathname() && hasSavedLocale()) {
  startHomeLcpPrefetch();
  startHomeRecommendedPrefetch();
  wireHomeLcpPrefetchToQueryClient(queryClient);
  /** P9-E: warm Home lazy chunk in parallel with App boot (Android cold load). */
  void import("@/pages/home");
}

/** P9-3B: warm primary BottomNav route chunks after first paint. */
scheduleAfterFirstPaint(() => {
  void import("@/pages/profile");
  void import("@/pages/favorites");
  void import("@/pages/messages");
  void import("@/pages/create-ad");
});

/** P7-PR-8: SW registration after first paint — avoids competing with LCP on Home cold path. */
if (import.meta.env.PROD) {
  scheduleAfterFirstPaint(() => {
    registerProductionServiceWorker(import.meta.env.BASE_URL);
  });
}

scheduleDeferredFonts();
scheduleDeferredStyles();
initWebVitalsReporting();

/** P7-PR-6: gate copy sync before mount. */
ensureBootstrapLocales();

/** P7-PR-14: lcp-loader gates this module; mount App immediately (LCP phase already complete). */
void import("./App").then(({ default: App }) => {
  const root = document.getElementById("root");
  if (!root) return;
  createRoot(root).render(<App />);
});
