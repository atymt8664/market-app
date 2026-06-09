/** Run inside API container (/app): node p17-prelaunch-2-list-api-check.mjs */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pg = require("pg");

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("FAIL DATABASE_URL missing");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const userRes = await client.query(
  `SELECT o.buyer_user_id AS uid
   FROM orders o
   ORDER BY o.created_at DESC
   LIMIT 1`,
);
const userId = userRes.rows[0]?.uid;
if (!userId) {
  console.log("WARN no orders — skip list field check");
  await client.end();
  process.exit(0);
}

const { ordersService } = await import("./artifacts/api-server/dist/index.mjs").then(() =>
  import("./artifacts/api-server/src/lib/p17/orders-service.ts"),
);

const { items } = await ordersService.listBuyerOrders(Number(userId));
await client.end();

if (items.length === 0) {
  console.log("WARN empty buyer list");
  process.exit(0);
}

const sample = items[0];
const hasAdId = typeof sample.adId === "number" && sample.adId > 0;
const hasImage = typeof sample.imageUrl === "string" && sample.imageUrl.trim().length > 0;
console.log(`list_items=${items.length} adId=${sample.adId ?? "none"} imageUrl=${hasImage ? "yes" : "no"} mock=false`);

if (!hasAdId && !hasImage) {
  console.log("FAIL list item missing adId and imageUrl");
  process.exit(1);
}
console.log("OK orders list thumbnail fields");
