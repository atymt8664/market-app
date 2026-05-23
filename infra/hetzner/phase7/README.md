# Phase 7 — Production Cutover Execution (gradual, zero public downtime)

Railway (`https://api.souq-arab.com`) stays live until Vercel/DNS point to VPS.

1. Read-only external prod smoke (no secrets)
2. Parallel prod API on `127.0.0.1:3002` when `api.env.production` is filled
3. Optional activate `:3001` only with `SOUQ_CUTOVER_APPROVED=1`

```bash
sudo bash /opt/souq-arab/scripts/phase7-apply.sh
bash /opt/souq-arab/scripts/phase7-prod-readonly-external.sh
sudo bash /opt/souq-arab/scripts/phase7-execute-cutover.sh   # exits 2 if env empty
sudo bash /opt/souq-arab/scripts/phase7-rollback-staging.sh
```
