#!/usr/bin/env bash
# Shared guard for production cutover scripts (P0).
# Requires explicit approval: SOUQ_CUTOVER_APPROVED=1 (set only by Mohamed).
# Does not modify Vercel, DNS, SSL, or Supabase — callers must still be run on VPS with care.
if [[ "${SOUQ_CUTOVER_APPROVED:-}" != "1" ]]; then
  echo "REFUSED: Production cutover requires SOUQ_CUTOVER_APPROVED=1 (explicit approval from Mohamed)." >&2
  echo "This script was not run. No changes were made." >&2
  exit 99
fi
