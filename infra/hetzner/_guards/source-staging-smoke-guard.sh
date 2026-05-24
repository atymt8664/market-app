#!/usr/bin/env bash
# Resolve and source require-staging-smoke-target.sh from repo or VPS install path.
_souq_source_staging_smoke_guard() {
  local script_dir="$1"
  if [[ -f "${script_dir}/require-staging-smoke-target.sh" ]]; then
    # shellcheck source=/dev/null
    source "${script_dir}/require-staging-smoke-target.sh"
  elif [[ -f "${script_dir}/../_guards/require-staging-smoke-target.sh" ]]; then
    # shellcheck source=/dev/null
    source "${script_dir}/../_guards/require-staging-smoke-target.sh"
  elif [[ -f "/opt/souq-arab/scripts/require-staging-smoke-target.sh" ]]; then
    # shellcheck source=/dev/null
    source "/opt/souq-arab/scripts/require-staging-smoke-target.sh"
  else
    echo "REFUSE: require-staging-smoke-target.sh not found" >&2
    exit 1
  fi
}
