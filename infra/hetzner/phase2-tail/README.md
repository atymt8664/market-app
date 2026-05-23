# Phase 2 / Phase 1 Tail — Gradual VPS cutover (zero downtime)

**Scope:** STAGING active on VPS `:3001`; production shadow on `:3002`; Railway remains fallback 48–72h after public switch.

## Readiness matrix (diagnosed)

| Gate | Status | Notes |
|------|--------|-------|
| VPS STAGING | PASS | `api.env` → staging; ref `qkczposlooaldmsjfmun` |
| VPS production env | PASS | `api.env.production` filled; ref `nptfxtkedqndkgmrcntn` |
| Production shadow `:3002` | PASS | `souq-api:production-candidate` healthy |
| Railway fallback | PASS | `https://api.souq-arab.com` → Railway (DNS) |
| Rollback | PASS | `rollback-api.sh` + `PREVIOUS_TAG` |
| TLS on VPS `:443` | PENDING | nginx `:80` only; certbot after `api` A → VPS IP |
| DNS `api.souq-arab.com` | PENDING | Currently Railway; swing only with approval |
| Vercel `/api` rewrite | PREPARED | `vercel.json` → `http://178.105.206.173/api/:path*` (deploy = separate approval) |

## VPS verify (deploy user)

```powershell
.\scripts\staging-phase2-tail-verify.ps1
```

## Public cutover order (Mohammed approval each step)

1. Deploy Vercel rewrite (VPS HTTP path; Railway unchanged at `api.souq-arab.com`)
2. Monitor 48–72h (Sentry, phase5 baseline, smoke)
3. Optional: DNS `api` → VPS + `certbot --nginx -d api.souq-arab.com`
4. Update rewrite to `https://api.souq-arab.com` when VPS TLS live
5. Stop Railway only after explicit approval

## Rollback

- Vercel: revert rewrite to Railway URL
- VPS: `sudo bash /opt/souq-arab/scripts/rollback-api.sh`
- Env: `sudo bash /opt/souq-arab/scripts/phase7-rollback-staging.sh`
