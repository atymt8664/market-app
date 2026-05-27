import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { ensureStaffManagementSchema } from "./admin-staff-management";
import type { AdminStaffStatus } from "./admin-staff";

const BCRYPT_ROUNDS = 12;

export function validateStaffPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export function generateTemporaryStaffPassword(length = 16): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%&*";
  const all = upper + lower + digits + special;
  const pick = (chars: string) => chars[randomBytes(1)[0]! % chars.length]!;
  const chars: string[] = [pick(upper), pick(lower), pick(digits), pick(special)];
  while (chars.length < length) {
    chars.push(pick(all));
  }
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomBytes(1)[0]! % (i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}

export async function hashStaffPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyStaffPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export type StaffLoginRecord = {
  adminActorId: number;
  displayName: string;
  roleKey: string;
  status: AdminStaffStatus;
  isActive: boolean;
  mustChangePassword: boolean;
  passwordHash: string;
};

export async function findStaffLoginByEmail(email: string): Promise<StaffLoginRecord | null> {
  await ensureStaffManagementSchema();
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const rows = await db.execute<{
    admin_actor_id: number;
    display_name: string;
    role_key: string;
    status: string;
    is_active: boolean;
    must_change_password: boolean;
    password_hash: string | null;
  }>(sql`
    SELECT admin_actor_id, display_name, role_key, status, is_active,
           must_change_password, password_hash
    FROM admin_staff
    WHERE login_email = ${normalized}
    LIMIT 1
  `);

  const row = rows.rows[0];
  if (!row?.password_hash) return null;

  return {
    adminActorId: row.admin_actor_id,
    displayName: row.display_name,
    roleKey: row.role_key,
    status: (row.status || "active") as AdminStaffStatus,
    isActive: row.is_active,
    mustChangePassword: Boolean(row.must_change_password),
    passwordHash: row.password_hash,
  };
}

export async function changeStaffPassword(params: {
  adminActorId: number;
  newPasswordHash: string;
  clearMustChange: boolean;
}): Promise<void> {
  await ensureStaffManagementSchema();
  await db.execute(sql`
    UPDATE admin_staff
    SET password_hash = ${params.newPasswordHash},
        must_change_password = ${params.clearMustChange ? false : true},
        password_changed_at = NOW(),
        updated_at = NOW()
    WHERE admin_actor_id = ${params.adminActorId}
  `);
}
