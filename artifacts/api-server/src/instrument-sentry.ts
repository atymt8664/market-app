/**
 * Sentry must initialize before other application modules (Sentry Node.js guidance).
 * Loaded first from index.ts — do not import app/routes before this runs.
 */
import "./load-env";
import { initSentry } from "./lib/sentry";

initSentry();
