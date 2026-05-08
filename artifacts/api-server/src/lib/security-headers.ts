import type { RequestHandler } from "express";
import helmet from "helmet";

/** Restrict powerful browser features for documents that hit the API origin (minimal surface). */
const PERMISSIONS_POLICY =
  "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()";

/**
 * API-only security headers (JSON, uploads, streamed objects). CSP is strict: this origin
 * does not serve the SPA document; Vercel sends the browser CSP (see vercel.json).
 */
export function apiSecurityHeadersMiddleware(isProduction: boolean): RequestHandler {
  const helmetMw = helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    hsts: isProduction
      ? { maxAge: 31_536_000, includeSubDomains: true, preload: false }
      : false,
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  });

  return (req, res, next) => {
    res.setHeader("Permissions-Policy", PERMISSIONS_POLICY);
    helmetMw(req, res, next);
  };
}
