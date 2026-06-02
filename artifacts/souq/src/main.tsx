import { createRoot } from "react-dom/client";
/** P7-PR-7: sync critical CSS only — full index.css deferred after first paint. */
import "./home-critical.css";
import { ensureBootstrapLocales } from "@/i18n";
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
  wireHomeLcpPrefetchToQueryClient,
} from "@/lib/home-lcp-prefetch";
import { scheduleDeferredAppMount } from "@/lib/deferred-app-bootstrap";

const apiBase = getApiBaseUrl();
setBaseUrl(apiBase || null);

installAccountDisabledFetchInterceptor(queryClient);

/** P7-PR-9: featured API + LCP hero preload before React — seeds React Query on Home. */
startHomeLcpPrefetch();
wireHomeLcpPrefetchToQueryClient(queryClient);

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

/** P7-PR-12: defer App chunk until LCP layer paints; dynamic import shrinks sync entry. */
scheduleDeferredAppMount(() => {
  void import("./App").then(({ default: App }) => {
    const root = document.getElementById("root");
    if (!root) return;
    createRoot(root).render(<App />);
  });
});
