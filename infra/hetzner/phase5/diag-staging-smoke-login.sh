#!/usr/bin/env bash
# STAGING only — diagnose smoke login without printing secrets.
set -u
ENV_FILE="/opt/souq-arab/config/api.env.staging"
CONTAINER="${SOUQ_API_CONTAINER:-souq-arab-api-api-1}"
SE="$(grep -E '^STAGING_SMOKE_EMAIL=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
SP="$(grep -E '^STAGING_SMOKE_PASSWORD=' "$ENV_FILE" | head -1 | cut -d= -f2-)"

echo "email_set=$([[ -n "${SE:-}" ]] && echo yes || echo no)"
echo "pass_set=$([[ -n "${SP:-}" ]] && echo yes || echo no)"
echo "pass_len=${#SP}"

payload=$(SE="$SE" SP="$SP" python3 -c 'import json,os; print(json.dumps({"email":os.environ["SE"],"password":os.environ["SP"]}))')
c=$(curl -s -o /tmp/login_body.json -w '%{http_code}' -X POST \
  -H 'Content-Type: application/json' -H 'User-Agent: souq-p5-diag' \
  -d "$payload" http://127.0.0.1/api/auth/login)
echo "login_http=$c"
python3 -c 'import json; j=json.load(open("/tmp/login_body.json")); print("login_code="+str(j.get("code","none"))); print("has_error="+str("error" in j))' 2>/dev/null || echo "login_body_unparsed"
rm -f /tmp/login_body.json

docker exec -e SMOKE_EMAIL="$SE" "$CONTAINER" node -e "
const pg=require('pg');
const email=process.env.SMOKE_EMAIL;
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
pool.query('select id,email_verified,is_banned from users where email=\$1 limit 1',[email])
.then(r=>{
  console.log('user_exists='+(r.rowCount>0));
  if(r.rows[0]) console.log('verified='+r.rows[0].email_verified,'banned='+r.rows[0].is_banned);
  return pool.end();
}).catch(()=>{console.log('db_check_fail'); process.exit(1)});
"
