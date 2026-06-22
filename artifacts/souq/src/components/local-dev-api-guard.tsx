import { useEffect, useState } from "react";
import {
  isLocalDevApiGuardEligible,
  LOCAL_DEV_API_GUARD_POLL_MS,
  probeLocalDevApiHealth,
} from "@/lib/local-dev-api-guard";

/**
 * Dev-only banner when Vite proxy cannot reach local API (pnpm dev:api).
 * No effect on production www or remote hosts.
 */
export function LocalDevApiGuardBanner() {
  const [eligible] = useState(() => isLocalDevApiGuardEligible());
  const [apiUp, setApiUp] = useState<boolean | null>(eligible ? null : true);

  useEffect(() => {
    if (!eligible) return;

    let cancelled = false;

    const runProbe = async () => {
      const ok = await probeLocalDevApiHealth();
      if (!cancelled) setApiUp(ok);
    };

    void runProbe();
    const id = window.setInterval(() => {
      void runProbe();
    }, LOCAL_DEV_API_GUARD_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [eligible]);

  if (!eligible || apiUp !== false) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="local-dev-api-guard"
      className="pointer-events-none fixed inset-x-0 top-0 z-[250] flex justify-center px-3 pt-[max(8px,env(safe-area-inset-top))]"
    >
      <div className="pointer-events-auto max-w-lg rounded-b-xl border border-amber-500/40 bg-[#1a1408]/95 px-4 py-3 text-center shadow-lg backdrop-blur-sm">
        <p className="text-sm font-semibold text-amber-200">Local API is not running.</p>
        <p className="mt-1 font-mono text-xs leading-relaxed text-amber-100/90">
          Start from repo root:
          <br />
          pnpm dev:api
        </p>
        <p className="mt-2 text-[11px] leading-snug text-amber-100/70">
          Vite proxies <code className="text-amber-50">/api/*</code> to{" "}
          <code className="text-amber-50">localhost:3001</code>. Home will load once the API is up.
        </p>
      </div>
    </div>
  );
}
