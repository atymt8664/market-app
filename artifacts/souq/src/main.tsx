import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ensureBootstrapLocales } from "@/i18n";
import { getApiBaseUrl } from "@/lib/api-url";
import { setBaseUrl } from "@workspace/api-client-react";
import { queryClient } from "@/lib/query-client";
import { installAccountDisabledFetchInterceptor } from "@/lib/account-disabled-interceptor";
import { scheduleDeferredFonts } from "@/lib/deferred-fonts";
import { registerProductionServiceWorker } from "@/lib/register-production-service-worker";
import { initWebVitalsReporting } from "@/lib/web-vitals-reporting";

const apiBase = getApiBaseUrl();
setBaseUrl(apiBase || null);

installAccountDisabledFetchInterceptor(queryClient);

if (import.meta.env.PROD) {
  registerProductionServiceWorker(import.meta.env.BASE_URL);
}

scheduleDeferredFonts();
initWebVitalsReporting();

function mountApp(): void {
  createRoot(document.getElementById("root")!).render(<App />);
}

/** Gate copy first, then full Arabic before paint — no raw i18n keys on refresh (P7-PR-3 fix). */
void ensureBootstrapLocales().then(() => mountApp());
