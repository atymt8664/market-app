import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { getApiBaseUrl } from "@/lib/api-url";
import { setBaseUrl } from "@workspace/api-client-react";

const apiBase = getApiBaseUrl();
setBaseUrl(apiBase || null);

createRoot(document.getElementById("root")!).render(<App />);
