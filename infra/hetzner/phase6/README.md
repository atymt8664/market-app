# Phase 6 — Cutover prep + post-cutover stabilization

## Prep (historical)

```bash
sudo bash /opt/souq-arab/scripts/phase6-apply-cutover-prep.sh
sudo bash /opt/souq-arab/scripts/verify-phase6.sh
```

Marker: `/etc/souq/phase6-prep-applied-at.txt`

## Stabilization (post Phase 5 cutover)

| Script | Purpose |
|--------|---------|
| `phase6-stabilization-diagnose.sh` | TLS, nginx → `:3002`, Resend/FRONTEND_URL, forgot-password, Vercel HTTPS rewrite |
| `phase6-stabilization-smoke.sh` | Public smoke (health, auth edges, reports, support, admin) |
| `phase6-vps-monitor-snapshot.sh` | CPU/RAM/docker/nginx → `/var/log/souq-arab/monitor/snapshot-*.txt` |
| `phase6-test-forgot-password-existing.sh` | forgot-password with `PROD_SMOKE_EMAIL` (no secrets logged) |

```bash
bash /opt/souq-arab/scripts/phase6-stabilization-diagnose.sh
bash /opt/souq-arab/scripts/phase6-stabilization-smoke.sh
sudo bash /opt/souq-arab/scripts/phase6-vps-monitor-snapshot.sh
```

Optional cron (VPS only, no new subscriptions): `*/15 * * * * /opt/souq-arab/scripts/phase6-vps-monitor-snapshot.sh`

**Code:** `auth.ts` uses `AuthForgotPasswordBody.safeParse(req.body ?? {})` — invalid/missing JSON → 400, not 500. Ship via tagged Docker image (`IMAGE-TAGGING.md`).
