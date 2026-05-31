import assert from "node:assert/strict";
import {
  assertP17OrdersStagingOnly,
  detectSupabaseProjectRef,
  isP17OrdersApiEnabled,
  useP17OrdersDatabaseProvider,
} from "./orders-env-guard.ts";

const prevEnabled = process.env.P17_ORDERS_API_ENABLED;
const prevDb = process.env.DATABASE_URL;
const prevProdAllow = process.env.P17_ORDERS_PRODUCTION_ALLOWED;

try {
  delete process.env.P17_ORDERS_API_ENABLED;
  assert.equal(isP17OrdersApiEnabled(), false);
  assert.equal(useP17OrdersDatabaseProvider(), false);

  process.env.P17_ORDERS_API_ENABLED = "1";
  process.env.DATABASE_URL = "postgresql://u:p@db.qkczposlooaldmsjfmun.supabase.co:5432/postgres";
  assert.equal(isP17OrdersApiEnabled(), true);
  assert.equal(detectSupabaseProjectRef(), "qkczposlooaldmsjfmun");
  assert.equal(useP17OrdersDatabaseProvider(), true);
  assert.doesNotThrow(() => assertP17OrdersStagingOnly());

  process.env.DATABASE_URL = "postgresql://u:p@db.nptfxtkedqndkgmrcntn.supabase.co:5432/postgres";
  assert.throws(() => assertP17OrdersStagingOnly(), /PRODUCTION Supabase ref|STAGING Supabase ref/);

  process.env.P17_ORDERS_PRODUCTION_ALLOWED = "1";
  assert.throws(() => assertP17OrdersStagingOnly(), /STAGING Supabase ref/);
} finally {
  if (prevEnabled === undefined) delete process.env.P17_ORDERS_API_ENABLED;
  else process.env.P17_ORDERS_API_ENABLED = prevEnabled;
  if (prevDb === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = prevDb;
  if (prevProdAllow === undefined) delete process.env.P17_ORDERS_PRODUCTION_ALLOWED;
  else process.env.P17_ORDERS_PRODUCTION_ALLOWED = prevProdAllow;
}

console.log("orders-env-guard.test.mjs: PASS");
