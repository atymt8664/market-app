import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import type { ProxyOptions } from "vite";
import { visualizer } from "rollup-plugin-visualizer";
import { assertSafeLocalFrontendApiEnv } from "./scripts/assert-safe-frontend-api-env.mjs";

const rawPort = process.env.PORT ?? "5173";
const port = Number(rawPort) || 5173;

const basePath = process.env.BASE_PATH ?? "/";

const isProductionBuild =
  process.argv.includes("build") ||
  (process.env.npm_lifecycle_script ?? "").includes("vite build");

const apiProxyTarget =
  process.env.API_PROXY_TARGET?.trim() || "http://localhost:3001";

/** Constitution: block Local dev/preview → Production API (see PROJECT_CONSTITUTION.md). */
if (!isProductionBuild) {
  const loadedEnv = loadEnv("development", import.meta.dirname, "");
  assertSafeLocalFrontendApiEnv({
    apiProxyTarget,
    viteApiBaseUrl: loadedEnv.VITE_API_BASE_URL,
  });
}

/**
 * Stable vendor splits for production — reduces entry parse cost and improves HTTP cache.
 * Order: most-specific paths first (e.g. react-dom before react).
 */
function souqManualChunks(id: string): string | undefined {
  const norm = id.replace(/\\/g, "/");
  if (!norm.includes("node_modules/")) return undefined;

  if (norm.includes("node_modules/react-dom/")) return "vendor-react-dom";
  if (norm.includes("node_modules/react/")) return "vendor-react";
  if (norm.includes("node_modules/scheduler/")) return "vendor-react";
  /** Used by Recharts (and others); keep with React so `vendor-recharts` does not depend on `vendor-misc` for this. */
  if (norm.includes("node_modules/react-is/")) return "vendor-react";

  /** Shared tiny util used by app + Recharts; keep out of `vendor-misc` to avoid `vendor-recharts` ↔ `vendor-misc` cycles. */
  if (norm.includes("node_modules/clsx/")) return "vendor-react";

  if (norm.includes("node_modules/@tanstack/")) return "vendor-tanstack";

  if (norm.includes("node_modules/@radix-ui/")) return "vendor-radix";

  if (norm.includes("node_modules/lucide-react/")) return "vendor-lucide";

  /** Framer Motion ships core animation logic in separate packages; keep them with `framer-motion` (not `vendor-misc`). */
  if (norm.includes("node_modules/motion-dom/")) return "vendor-framer-motion";
  if (norm.includes("node_modules/motion-utils/")) return "vendor-framer-motion";
  if (norm.includes("node_modules/framer-motion/")) return "vendor-framer-motion";

  if (norm.includes("node_modules/recharts")) return "vendor-recharts";
  /** Recharts pulls d3 + helpers into the graph unless assigned here (otherwise they land in `vendor-misc` via Rollup chunking). */
  if (norm.includes("node_modules/d3-")) return "vendor-recharts";
  if (norm.includes("node_modules/d3/")) return "vendor-recharts";
  /**
   * Lodash is a Recharts transitive dep. Assigning it to `vendor-recharts` created a Rollup
   * circular chunk (`vendor-recharts` ↔ `vendor-misc`) because `vendor-misc` still needs lodash.
   * A dedicated chunk removes lodash from `vendor-misc` without that cycle.
   */
  if (norm.includes("node_modules/lodash/")) return "vendor-lodash";
  if (norm.includes("node_modules/react-smooth/")) return "vendor-recharts";
  if (norm.includes("node_modules/decimal.js-light/")) return "vendor-recharts";
  if (norm.includes("node_modules/fast-equals/")) return "vendor-recharts";
  if (norm.includes("node_modules/eventemitter3/")) return "vendor-recharts";
  /**
   * Recharts / react-smooth / d3-array transitive deps that do not match `d3-*` paths
   * (otherwise Rollup places them in `vendor-misc` and can create `vendor-recharts` ↔ `vendor-misc` cycles).
   */
  if (norm.includes("node_modules/internmap/")) return "vendor-recharts";
  if (norm.includes("node_modules/prop-types/")) return "vendor-recharts";
  if (norm.includes("node_modules/react-transition-group/")) return "vendor-recharts";
  if (norm.includes("node_modules/tiny-invariant/")) return "vendor-recharts";
  if (norm.includes("node_modules/victory-vendor/")) return "vendor-recharts";

  if (norm.includes("node_modules/react-hook-form/")) return "vendor-rhf";
  if (norm.includes("node_modules/@hookform/")) return "vendor-rhf";

  if (norm.includes("node_modules/date-fns/")) return "vendor-date-fns";

  if (norm.includes("node_modules/@uppy/")) return "vendor-uppy";

  if (norm.includes("node_modules/zod/")) return "vendor-zod";

  if (norm.includes("node_modules/embla-carousel")) return "vendor-embla";
  if (norm.includes("node_modules/react-day-picker/")) return "vendor-day-picker";
  if (norm.includes("node_modules/cmdk/")) return "vendor-cmdk";
  if (norm.includes("node_modules/vaul/")) return "vendor-vaul";
  if (norm.includes("node_modules/sonner/")) return "vendor-sonner";
  if (norm.includes("node_modules/react-resizable-panels/")) return "vendor-resizable-panels";
  if (norm.includes("node_modules/input-otp/")) return "vendor-input-otp";
  /** Legacy: `country-state-city` was excluded from named vendor chunks; kept harmless if ever reintroduced. */
  if (norm.includes("node_modules/country-state-city/")) return undefined;
  if (norm.includes("node_modules/react-icons/")) return "vendor-react-icons";
  if (norm.includes("node_modules/next-themes/")) return "vendor-next-themes";

  if (norm.includes("node_modules/leaflet/")) return "vendor-leaflet";

  if (norm.includes("node_modules/@supabase/")) return "vendor-supabase";

  if (norm.includes("node_modules/@floating-ui/")) return "vendor-floating-ui";

  return "vendor-misc";
}

/** P7-PR-12: build-time fallback shell (#p7-lcp-layer) when Edge middleware unavailable (local preview). */
function injectHomeHtmlShell(): {
  name: string;
  apply: "build";
  transformIndexHtml: {
    order: "pre";
    handler: (html: string) => Promise<string>;
  };
} {
  return {
    name: "p7-pr-12-home-html-shell",
    apply: "build",
    transformIndexHtml: {
      order: "pre",
      async handler(html: string) {
        /** Vercel: Edge middleware injects shell on GET / only — avoid baking featured HTML into SPA index. */
        if (process.env.HOME_LCP_SHELL_SKIP === "1" || process.env.VERCEL === "1") return html;
        try {
          const { buildHomeShellInjection, applyHomeShellToHtml } = await import(
            "./scripts/home-lcp-shell.mjs"
          );
          const injection = await buildHomeShellInjection();
          if (!injection) {
            // eslint-disable-next-line no-console -- build diagnostics
            console.warn("[p7-pr-12] Home LCP layer skipped (featured API unavailable at build).");
            return html;
          }
          // eslint-disable-next-line no-console -- build diagnostics
          console.info(
            `[p7-pr-12] Home LCP layer: ad #${injection.lead.id} in #p7-lcp-layer`,
          );
          return applyHomeShellToHtml(html, injection);
        } catch (err) {
          // eslint-disable-next-line no-console -- build diagnostics
          console.warn("[p7-pr-12] Home LCP layer injection failed:", err);
          return html;
        }
      },
    },
  };
}

/** P7-PR-14: remove all modulepreload — lcp-loader defers react-dom/tanstack until after shell LCP. */
function trimAllModulePreloads(): { name: string; transformIndexHtml: { order: "post"; handler: (html: string) => string } } {
  return {
    name: "souq-trim-modulepreload",
    transformIndexHtml: {
      order: "post",
      handler(html: string) {
        return html.replace(/\s*<link rel="modulepreload"[^>]*>\s*/g, "");
      },
    },
  };
}

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
    {
      name: "log-api-proxy-target",
      configureServer(server) {
        server.httpServer?.once("listening", () => {
          const addr = server.httpServer?.address();
          const where =
            addr && typeof addr === "object"
              ? `http://${addr.address === "::" ? "localhost" : addr.address}:${addr.port}`
              : "";
          // eslint-disable-next-line no-console -- dev-only diagnostics for LAN/mobile debugging
          console.info(
            `\n[vite] Dev server ${where || ""}\n[vite] Browser calls /api/* → proxied to API_PROXY_TARGET=${JSON.stringify(apiProxyTarget)}\n[vite] Set API_PROXY_TARGET=http://10.x.x.x:3001 if the API runs on another host.\n`,
          );
        });
      },
    },
    react(),
    tailwindcss(),
    injectHomeHtmlShell(),
    trimAllModulePreloads(),
    ...(process.env.BUNDLE_ANALYZE === "1"
      ? [
          visualizer({
            filename: path.resolve(import.meta.dirname, "dist/bundle-stats.json"),
            template: "raw-data",
            gzipSize: true,
            brotliSize: false,
            open: false,
          }),
          visualizer({
            filename: path.resolve(import.meta.dirname, "dist/bundle-stats.html"),
            template: "treemap",
            gzipSize: true,
            brotliSize: false,
            open: false,
          }),
        ]
      : []),
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
    /** P7-PR-14: no dynamic modulepreload graph until lcp-loader imports main (post-LCP). */
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks: souqManualChunks,
      },
    },
  },
  server: {
    port,
    strictPort: true,
    /** `true` exposes LAN like 0.0.0.0; avoids some Windows bind quirks vs a raw 0.0.0.0 string. */
    host: true,
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
    host: true,
    allowedHosts: true,
    proxy: {
      "/api": apiProxy,
    },
  },
});
