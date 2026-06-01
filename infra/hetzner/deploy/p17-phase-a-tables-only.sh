#!/usr/bin/env bash
set -euo pipefail
PROD_REF="nptfxtkedqndkgmrcntn"
SC=$(docker ps --format '{{.Names}}' | grep prod-shadow-api-prod-shadow | head -1)
echo "container=$SC"
docker exec "$SC" node -e "
const ref='$PROD_REF';
const u=process.env.DATABASE_URL||'';
if(!u.includes(ref)){console.log('REFUSE_ENV_REF');process.exit(3);}
const pg=require('pg');
const pool=new pg.Pool({connectionString:u,ssl:{rejectUnauthorized:false}});
const tables=['orders','order_items','order_status_history','buyer_addresses','shipments','shipment_events','order_issues'];
(async()=>{
  const r=await pool.query(\"select table_name from information_schema.tables where table_schema='public' and table_name = any(\$1)\",[tables]);
  const found=new Set(r.rows.map(x=>x.table_name));
  for(const t of tables){ console.log((found.has(t)?'OK':'MISSING')+' '+t); }
  await pool.end();
})().catch(e=>{console.log('ERR '+e.message);process.exit(2);});
"
