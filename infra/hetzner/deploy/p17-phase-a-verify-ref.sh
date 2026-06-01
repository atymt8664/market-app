#!/usr/bin/env bash
set -euo pipefail
PROD_REF="nptfxtkedqndkgmrcntn"
SC=$(docker ps --format '{{.Names}}' | grep prod-shadow-api-prod-shadow | head -1)
docker exec "$SC" node -e "
const u=process.env.DATABASE_URL||'';
console.log('has_prod_ref', u.includes('$PROD_REF'));
console.log('has_staging_ref', u.includes('qkczposlooaldmsjfmun'));
const pg=require('pg');
const pool=new pg.Pool({connectionString:u,ssl:{rejectUnauthorized:false}});
pool.query(\"select count(*)::int as n from information_schema.tables where table_schema='public'\").then(r=>{
  console.log('public_table_count', r.rows[0].n);
  return pool.end();
}).catch(e=>{console.log('ERR',e.message);process.exit(2);});
"
