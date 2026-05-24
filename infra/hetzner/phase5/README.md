# Phase 5 — STAGING Shadow Observability + Load Baseline (VPS only)

**Scope:** Metrics baseline, light load smoke, WebSocket probe with smoke session, cutover runbook (docs).  
**Not in scope:** Production, DNS/TLS, Railway/Vercel, Admin UI/auth changes, cutover execution.

**Server:** `178.105.206.173` — STAGING ref `qkczposlooaldmsjfmun` only.

## STAGING smoke target (official)

All STAGING smoke scripts **must** hit the staging API container directly:

| Target | Role |
|--------|------|
| `http://127.0.0.1:3001` | **Official STAGING smoke base** (`souq-arab-api-api-1`, ref `qkczposlooaldmsjfmun`) |
| `http://127.0.0.1:3002` | prod-shadow only — **never** for STAGING smoke |
| `http://127.0.0.1` (nginx :80) | May proxy to prod-shadow during prep — **never** for STAGING smoke |

Guard: `require-staging-smoke-target.sh` (fail-fast if `:80`, `:3002`, or HTTPS public base).

```bash
sudo bash /opt/souq-arab/scripts/phase5-apply-staging-baseline.sh
bash /opt/souq-arab/scripts/verify-staging-smoke-routing.sh
bash /opt/souq-arab/scripts/verify-phase5.sh
```

Outputs: `/var/log/souq-arab/baseline/` (no secrets).
