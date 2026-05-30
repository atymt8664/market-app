import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ensureLocalesForActive, hasSavedLocale, seedFirstLaunchLocales } from "@/i18n";
import { getApiBaseUrl } from "@/lib/api-url";
import { setBaseUrl } from "@workspace/api-client-react";
import { queryClient } from "@/lib/query-client";
import { installAccountDisabledFetchInterceptor } from "@/lib/account-disabled-interceptor";
import { scheduleDeferredFonts } from "@/lib/deferred-fonts";
import { registerProductionServiceWorker } from "@/lib/register-production-service-worker";

const apiBase = getApiBaseUrl();
setBaseUrl(apiBase || null);

installAccountDisabledFetchInterceptor(queryClient);

if (import.meta.env.PROD) {
  registerProductionServiceWorker(import.meta.env.BASE_URL);
}

scheduleDeferredFonts();

function mountApp(): void {
  createRoot(document.getElementById("root")!).render(<App />);
}

/** First launch: sync gate copy + immediate render — cuts LCP element render delay (7A.6). */
if (!hasSavedLocale()) {
  seedFirstLaunchLocales();
  mountApp();
} else {
  void ensureLocalesForActive().then(mountApp);
}
