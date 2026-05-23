# Phase 5 — STAGING Shadow Observability + Load Baseline (VPS only)

**Scope:** Metrics baseline, light load smoke, WebSocket probe with smoke session, cutover runbook (docs).  
**Not in scope:** Production, DNS/TLS, Railway/Vercel, Admin UI/auth changes, cutover execution.

**Server:** `178.105.206.173` — STAGING ref `qkczposlooaldmsjfmun` only.

```bash
sudo bash /opt/souq-arab/scripts/phase5-apply-staging-baseline.sh
sudo bash /opt/souq-arab/scripts/verify-phase5.sh
```

Outputs: `/var/log/souq-arab/baseline/` (no secrets).
