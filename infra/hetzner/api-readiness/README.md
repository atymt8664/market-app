# Phase 2 — Hybrid API Readiness (VPS only)

**Scope:** Directory layout, Docker Compose skeleton, Nginx reverse-proxy to `127.0.0.1:3001`, readiness stub (not production API), logging/monitoring hooks.

**Not in scope:** DNS, TLS, Redis, queues, Railway/Vercel/Supabase changes, production API image deploy, app source changes.

**Server:** `178.105.206.173` — apply as root or `deploy` with sudo:

```bash
sudo bash /opt/souq-arab/scripts/phase2-apply-readiness.sh
sudo bash /opt/souq-arab/scripts/verify-phase2.sh
```
