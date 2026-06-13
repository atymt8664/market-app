#!/usr/bin/env node
/**
 * P6-ORDERS-DELETE-1 — verify Option A+ account deletion + orders (requires DATABASE_URL).
 * Usage: DATABASE_URL=... node --import tsx/esm scripts/p6-orders-delete-1-verify.mjs
 */
import pg from "pg";
import bcrypt from "bcryptjs";
import {
  countActiveOrdersForUser,
  isActiveOrderStatusForDeletion,
  DELETED_ACCOUNT_TOMBSTONE_EMAIL,
  AccountDeletionActiveOrdersError,
} from "../src/lib/account-deletion-orders.ts";
import { deleteUserAccountInTransaction } from "../src/lib/account-deletion.ts";

const DATABASE_URL = process.env.DATABASE_URL || "";
if (!DATABASE_URL) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
});

const steps = [];
let passed = 0;
let failed = 0;

function ok(name, detail = null) {
  steps.push({ name, ok: true, detail });
  passed++;
  console.log(`PASS ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = null) {
  steps.push({ name, ok: false, detail });
  failed++;
  console.error(`FAIL ${name}${detail ? ` — ${JSON.stringify(detail)}` : ""}`);
}

async function createUser(suffix) {
  const email = `p6-ord-del-${suffix}-${Date.now()}@test.local`;
  const hash = await bcrypt.hash("TestPass123!", 10);
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, name, phone, city, email_verified)
     VALUES ($1, $2, $3, $4, $5, true) RETURNING id`,
    [email, hash, `Test ${suffix}`, "000", "Berlin"],
  );
  return { id: rows[0].id, email };
}

async function createAd(sellerId) {
  const { rows: cats } = await pool.query(`SELECT id FROM categories LIMIT 1`);
  const categoryId = cats[0]?.id ?? 1;
  const { rows } = await pool.query(
    `INSERT INTO ads (user_id, title, description, price, city, category_id, seller_name, seller_phone, status)
     VALUES ($1, $2, $3, 10, $4, $5, $6, $7, 'approved') RETURNING id`,
    [sellerId, "Test Ad", "Desc", "Berlin", categoryId, "Seller", "+490000"],
  );
  return rows[0].id;
}

async function createOrder({ buyerId, sellerId, adId, status, withAddress = false }) {
  const orderNumber = `TST-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
  const { rows } = await pool.query(
    `INSERT INTO orders (
       order_number, status, buyer_user_id, seller_user_id, ad_id,
       fulfillment_mode, subtotal_amount, shipping_amount, total_amount
     ) VALUES ($1, $2, $3, $4, $5, 'shipping', 10, 0, 10) RETURNING id`,
    [orderNumber, status, buyerId, sellerId, adId],
  );
  const orderId = rows[0].id;
  if (withAddress) {
    await pool.query(
      `INSERT INTO buyer_addresses (order_id, city, country_code, line1, recipient_name, phone)
       VALUES ($1, 'Berlin', 'DE', 'Street 1', 'Buyer Name', '+49111')`,
      [orderId],
    );
  }
  return { orderId, orderNumber };
}

async function run() {
  console.log("=== P6-ORDERS-DELETE-1 verify ===");

  ok("isActiveOrderStatusForDeletion shipped", isActiveOrderStatusForDeletion("shipped") === true);
  ok("isActiveOrderStatusForDeletion completed", isActiveOrderStatusForDeletion("completed") === false);
  ok("isActiveOrderStatusForDeletion draft", isActiveOrderStatusForDeletion("draft") === false);

  const seller = await createUser("seller");
  const buyer = await createUser("buyer");
  const buyer2 = await createUser("buyer2");
  const adId = await createAd(seller.id);

  try {
    const deleted = await deleteUserAccountInTransaction(buyer2.id);
    if (deleted) ok("User without orders deletes");
    else fail("User without orders deletes");
  } catch (e) {
    fail("User without orders deletes", String(e));
  }

  const completed = await createOrder({
    buyerId: buyer.id,
    sellerId: seller.id,
    adId,
    status: "completed",
    withAddress: true,
  });
  try {
    const deleted = await deleteUserAccountInTransaction(buyer.id);
    if (deleted) ok("Buyer with completed order deletes");
    else fail("Buyer with completed order deletes");
  } catch (e) {
    fail("Buyer with completed order deletes", String(e));
  }

  const { rows: addrAfter } = await pool.query(
    `SELECT recipient_name, phone, line1 FROM buyer_addresses WHERE order_id = $1`,
    [completed.orderId],
  );
  if (addrAfter[0]?.recipient_name === "[removed]" && !addrAfter[0]?.phone) {
    ok("Buyer address anonymized on completed order");
  } else {
    fail("Buyer address anonymized", addrAfter[0]);
  }

  const { rows: orderAfter } = await pool.query(
    `SELECT buyer_user_id FROM orders WHERE id = $1`,
    [completed.orderId],
  );
  const { rows: tomb } = await pool.query(`SELECT id FROM users WHERE email = $1`, [
    DELETED_ACCOUNT_TOMBSTONE_EMAIL,
  ]);
  const tombId = tomb[0]?.id;
  if (tombId && orderAfter[0]?.buyer_user_id === tombId) {
    ok("Completed order buyer reassigned to tombstone");
  } else {
    fail("Completed order buyer tombstone", { orderAfter, tombId });
  }

  const seller2 = await createUser("seller2");
  const buyer3 = await createUser("buyer3");
  const ad2 = await createAd(seller2.id);
  await createOrder({ buyerId: buyer3.id, sellerId: seller2.id, adId: ad2, status: "cancelled" });
  try {
    const deleted = await deleteUserAccountInTransaction(seller2.id);
    if (deleted) ok("Seller with cancelled order deletes");
    else fail("Seller with cancelled order deletes");
  } catch (e) {
    fail("Seller with cancelled order deletes", String(e));
  }

  const { rows: adOwner } = await pool.query(`SELECT user_id FROM ads WHERE id = $1`, [ad2]);
  if (adOwner[0]?.user_id === tombId) {
    ok("Ad with orders reassigned to tombstone (seller delete)");
  } else {
    fail("Ad tombstone reassignment", adOwner[0]);
  }

  const seller3 = await createUser("seller3");
  const buyer4 = await createUser("buyer4");
  const ad3 = await createAd(seller3.id);
  await createOrder({ buyerId: buyer4.id, sellerId: seller3.id, adId: ad3, status: "confirmed" });

  const activeCount = await countActiveOrdersForUser(buyer4.id);
  if (activeCount >= 1) ok("Active order counted for buyer", `count=${activeCount}`);
  else fail("Active order count", activeCount);

  let blocked = false;
  try {
    await deleteUserAccountInTransaction(buyer4.id);
  } catch (e) {
    if (e instanceof AccountDeletionActiveOrdersError) blocked = true;
    else fail("Active order throws AccountDeletionActiveOrdersError", String(e));
  }
  if (blocked) ok("Active order blocks buyer deletion");
  else fail("Active order block");

  blocked = false;
  try {
    await deleteUserAccountInTransaction(seller3.id);
  } catch (e) {
    if (e instanceof AccountDeletionActiveOrdersError) blocked = true;
  }
  if (blocked) ok("Active order blocks seller deletion");
  else fail("Active order blocks seller");

  const seller4 = await createUser("seller4");
  const buyer5 = await createUser("buyer5");
  const ad4 = await createAd(seller4.id);
  const draft = await createOrder({
    buyerId: buyer5.id,
    sellerId: seller4.id,
    adId: ad4,
    status: "draft",
  });
  try {
    await deleteUserAccountInTransaction(buyer5.id);
    ok("User with only draft order deletes");
  } catch (e) {
    fail("Draft order delete", String(e));
  }
  const { rows: draftLeft } = await pool.query(`SELECT id FROM orders WHERE id = $1`, [draft.orderId]);
  if (draftLeft.length === 0) ok("Draft order removed on delete");
  else fail("Draft order removed", draftLeft);

  if (tombId) ok("Tombstone user exists", `id=${tombId}`);
  else fail("Tombstone user");

  console.log("\n=== Summary ===");
  console.log(JSON.stringify({ pass: passed, fail: failed, steps }, null, 2));
  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
