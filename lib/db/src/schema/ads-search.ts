import { customType } from "drizzle-orm/pg-core";

/** PostgreSQL tsvector — maintained by DB trigger (Phase 7A.4). */
export const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});
