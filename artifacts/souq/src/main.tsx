import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ensureLocalesForActive } from "@/i18n";
import { getApiBaseUrl } from "@/lib/api-url";
import { setBaseUrl } from "@workspace/api-client-react";
import { queryClient } from "@/lib/query-client";
import { installAccountDisabledFetchInterceptor } from "@/lib/account-disabled-interceptor";

const apiBase = getApiBaseUrl();
setBaseUrl(apiBase || null);

installAccountDisabledFetchInterceptor(queryClient);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
      })
      .catch(() => {});
  });
}

void ensureLocalesForActive().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
