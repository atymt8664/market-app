#!/usr/bin/env python3
"""Print JWT role + length only — never the key."""
import base64
import json
import re
import sys

path = sys.argv[1] if len(sys.argv) > 1 else "/opt/souq-arab/config/api.env.staging"
text = open(path, encoding="utf-8").read()
m = re.search(r"^SUPABASE_SERVICE_ROLE_KEY=(.*)$", text, re.M)
if not m:
    print("role=missing len=0")
    sys.exit(1)
tok = m.group(1).strip().strip('"').strip("'")
parts = tok.split(".")
if len(parts) < 2:
    print(f"role=invalid_jwt len={len(tok)}")
    sys.exit(1)
payload = parts[1]
pad = "=" * (-len(payload) % 4)
raw = payload.replace("-", "+").replace("_", "/") + pad
try:
    data = json.loads(base64.b64decode(raw))
    role = data.get("role", "no_role")
    print(f"role={role} len={len(tok)}")
    sys.exit(0 if role == "service_role" else 1)
except Exception:
    print(f"role=decode_error len={len(tok)}")
    sys.exit(1)
