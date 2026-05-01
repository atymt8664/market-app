import { adminActivityLogsTable, db } from "@workspace/db";
import { sql } from "drizzle-orm";

let ensureLogsTablePromise: Promise<void> | null = null;

type Primitive = string | number | boolean | null;
type SafeDetails = Record<string, Primitive>;

export type AdminActivityInput = {
  action: string;
  actorAdminId: number | null;
  targetType: "ad" | "report" | "support_ticket" | "user" | "category" | "city" | "system";
  targetId: number | null;
  details?: SafeDetails;
};

function trimValue(value: Primitive): Primitive {
  if (typeof value === "string") return value.slice(0, 300);
  return value;
}

const SENSITIVE_KEY_PATTERN =
  /(pass(word)?|token|secret|hash|cookie|authorization|api[-_]?key|credential)/i;

function sanitizeKey(key: string): string | null {
  if (!key || key.length > 64) return null;
  if (SENSITIVE_KEY_PATTERN.test(key)) return null;
  return key;
}

function sanitizePrimitive(value: Primitive): Primitive {
  if (typeof value !== "string") return value;
  if (SENSITIVE_KEY_PATTERN.test(value)) return "[REDACTED]";
  return trimValue(value);
}

function sanitizeDetails(input?: SafeDetails): SafeDetails {
  if (!input) return {};
  const output: SafeDetails = {};
  for (const [key, value] of Object.entries(input)) {
    const sanitizedKey = sanitizeKey(key);
    if (!sanitizedKey) continue;
    output[sanitizedKey] = sanitizePrimitive(value);
  }
  return output;
}

export function getAdminActorId(req: { session?: { userId?: unknown } }): number | null {
  const userId = req.session?.userId;
  return typeof userId === "number" && Number.isInteger(userId) && userId > 0
    ? userId
    : null;
}

async function ensureAdminActivityLogsTable() {
  if (!ensureLogsTablePromise) {
    ensureLogsTablePromise = db
      .execute(sql`
        create table if not exists admin_activity_logs (
          id serial primary key,
          action text not null,
          actor_admin_id integer null,
          target_type text not null,
          target_id integer null,
          details jsonb not null default '{}'::jsonb,
          created_at timestamptz not null default now()
        )
      `)
      .then(async () => {
        await db.execute(
          sql`create index if not exists admin_activity_logs_action_idx on admin_activity_logs(action)`,
        );
        await db.execute(
          sql`create index if not exists admin_activity_logs_target_type_idx on admin_activity_logs(target_type)`,
        );
        await db.execute(
          sql`create index if not exists admin_activity_logs_target_id_idx on admin_activity_logs(target_id)`,
        );
        await db.execute(
          sql`create index if not exists admin_activity_logs_created_at_idx on admin_activity_logs(created_at desc)`,
        );
        await db.execute(
          sql`create index if not exists admin_activity_logs_actor_admin_id_idx on admin_activity_logs(actor_admin_id)`,
        );
      })
      .catch((error) => {
        ensureLogsTablePromise = null;
        throw error;
      });
  }
  return ensureLogsTablePromise;
}

export async function logAdminActivity(input: AdminActivityInput): Promise<void> {
  try {
    await ensureAdminActivityLogsTable();
    await db.insert(adminActivityLogsTable).values({
      action: input.action,
      actorAdminId: input.actorAdminId,
      targetType: input.targetType,
      targetId: input.targetId,
      details: sanitizeDetails(input.details),
    });
  } catch (error) {
    console.error("Failed to write admin activity log", error);
  }
}

export async function ensureAdminLogsReady() {
  await ensureAdminActivityLogsTable();
}
