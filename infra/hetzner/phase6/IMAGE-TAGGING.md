# Image tagging (local build → registry → VPS)

## Naming

- STAGING shadow: `souq-api:staging-shadow-YYYYMMDD`
- Production candidate: `souq-api:production-YYYYMMDD`
- Never reuse staging tag for production cutover

## Local (when approved)

```bash
# From repo root — example only
docker build -f infra/hetzner/api-readiness/docker/Dockerfile -t souq-api:production-YYYYMMDD .
# push to your registry — credentials not in repo
```

## VPS deploy (cutover window only)

```bash
sudo bash /opt/souq-arab/scripts/deploy-api.sh --image <registry>/souq-api:production-YYYYMMDD
sudo bash /opt/souq-arab/scripts/verify-deploy.sh
```

Phase 6 prep only verifies `staging-shadow` image exists and documents the flow — no production pull.
