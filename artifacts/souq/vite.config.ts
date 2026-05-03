import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import type { ProxyOptions } from "vite";

const rawPort = process.env.PORT ?? "5173";
const port = Number(rawPort) || 5173;

const basePath = process.env.BASE_PATH ?? "/";

const apiProxyTarget =
  process.env.API_PROXY_TARGET?.trim() || "http://localhost:3001";

/** Forward browser Host so express-session Set-Cookie targets the public origin (e.g. trycloudflare.com), not localhost. */
const apiProxy: ProxyOptions = {
  target: apiProxyTarget,
  changeOrigin: false,
  /** WebSocket upgrades for `/api/ws` (chat) must be proxied to the API. */
  ws: true,
  configure(proxy) {
    proxy.on("proxyReq", (proxyReq, req) => {
      const host = req.headers.host;
      if (host) {
        proxyReq.setHeader("Host", host);
        proxyReq.setHeader("X-Forwarded-Host", host);
      }
      const xfProto = req.headers["x-forwarded-proto"];
      if (xfProto) {
        proxyReq.setHeader(
          "X-Forwarded-Proto",
          Array.isArray(xfProto) ? xfProto[0] : xfProto,
        );
      } else if (
        typeof host === "string" &&
        host.includes("trycloudflare.com")
      ) {
        proxyReq.setHeader("X-Forwarded-Proto", "https");
      }
    });
  },
};

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "attached_assets",
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    /**
     * Do not hardcode a LAN IP here — it breaks HMR/WebSocket when the PC IP changes or when
     * using trycloudflare (client must use the same host as the page: tunnel hostname + wss).
     * Optional LAN-only override: VITE_DEV_HMR_HOST=10.x.x.x pnpm run dev:web
     */
    hmr: process.env.VITE_DEV_HMR_HOST?.trim()
      ? {
          protocol: "ws",
          host: process.env.VITE_DEV_HMR_HOST.trim(),
          clientPort: port,
        }
      : process.env.VITE_TUNNEL_HMR === "1"
        ? {
            /** Page is https://*.trycloudflare.com — HMR must use wss:443 on the same host. */
            protocol: "wss",
            clientPort: 443,
          }
        : true,
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      "/api": apiProxy,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
