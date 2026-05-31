import { sql } from "drizzle-orm";
import { ordersTable } from "@workspace/db";

const ORDER_NUMBER_PREFIX = "SOUQ";
const ORDER_NUMBER_PAD = 6;

export function isOrderNumber(value: string): boolean {
  return /^SOUQ-\d{4}-\d{6}$/.test(value.trim());
}

type OrderNumberAllocatorTx = Parameters<
  Parameters<typeof import("@workspace/db").db.transaction>[0]
>[0];

/**
 * Allocate a unique human-readable order number inside the caller's transaction.
 * Format: SOUQ-YYYY-NNNNNN (P17-4-NAV deep link contract).
 */
export async function allocateOrderNumberInTx(
  tx: OrderNumberAllocatorTx,
  now = new Date(),
): Promise<string> {
  const year = now.getFullYear();
  const prefix = `${ORDER_NUMBER_PREFIX}-${year}-`;

  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext(${`p17-order-number-${year}`}))`,
  );

  const fromPos = prefix.length + 1;
  const [row] = await tx
    .select({
      maxSeq: sql<number>`COALESCE(MAX(CAST(SUBSTRING(${ordersTable.orderNumber} FROM ${sql.raw(String(fromPos))}) AS INTEGER)), 0)`,
    })
    .from(ordersTable)
    .where(sql`${ordersTable.orderNumber} LIKE ${`${prefix}%`}`);

  const next = (Number(row?.maxSeq) || 0) + 1;
  return `${prefix}${String(next).padStart(ORDER_NUMBER_PAD, "0")}`;
}
