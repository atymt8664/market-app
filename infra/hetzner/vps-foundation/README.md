# Hetzner VPS — production foundation (Souq Arab EU API)

**Scope:** OS hardening, Docker, Nginx, firewall — **no API deploy**, no DNS, no secrets in repo.

**Server:** `souq-arab-api-prod-01` — `178.105.206.173`

## Ubuntu 24.04 vs 26.04 (decision before bootstrap)

| | Ubuntu 24.04 LTS | Ubuntu 26.04 LTS |
|---|------------------|------------------|
| Maturity | Battle-tested (2024–2034) | Brand-new LTS (Apr 2026) |
| Docker / Nginx playbooks | Extensive | Growing |
| **Recommendation for 10–50y prod** | **Preferred** — rebuild in Hetzner console if VPS is still empty | OK for **foundation only**; consider moving to 24.04 before API go-live |

**If the VPS has no data yet:** Hetzner Cloud → Server → Rebuild → **Ubuntu 24.04 LTS**, then run bootstrap.

## SSH access required

From a machine that can reach the server:

```bash
# Copy script
scp infra/hetzner/vps-foundation/bootstrap-foundation.sh root@178.105.206.173:/root/

# Run (5–15 min)
ssh root@178.105.206.173 'chmod +x /root/bootstrap-foundation.sh && /root/bootstrap-foundation.sh'

# Verify
scp infra/hetzner/vps-foundation/verify-foundation.sh root@178.105.206.173:/root/
ssh root@178.105.206.173 'bash /root/verify-foundation.sh'
```

After bootstrap, prefer SSH as `deploy@178.105.206.173` (same keys as copied from root).

## What bootstrap installs

- `apt upgrade`, unattended security upgrades
- User `deploy` (sudo), SSH keys copied from root
- SSH hardening (no passwords; root disabled if deploy has keys)
- UFW: 22, 80, 443
- fail2ban (sshd)
- Docker CE + Compose plugin
- Nginx + `/healthz` placeholder
- certbot + nginx plugin (timer enabled; **no certificate** until DNS exists)
- 2GB swap, swappiness 10
- timezone `Europe/Berlin`
- prometheus-node-exporter (if available in apt)
- logrotate for nginx logs

## Not in scope

- Application env / secrets
- DNS / TLS certificates for production domain
- Railway / Vercel / Supabase changes
