import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const verificationRequestsTable = pgTable("verification_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  isUrgent: boolean("is_urgent").notNull().default(false),
  notes: text("notes"),
  rejectionReason: text("rejection_reason"),
  assignedStaffId: integer("assigned_staff_id"),
  assignedAt: timestamp("assigned_at", { withTimezone: true }),
  assignedByAdminId: integer("assigned_by_admin_id"),
  escalatedAt: timestamp("escalated_at", { withTimezone: true }),
  escalatedByAdminId: integer("escalated_by_admin_id"),
  escalationNote: text("escalation_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verificationRequestDocumentsTable = pgTable("verification_request_documents", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id")
    .notNull()
    .references(() => verificationRequestsTable.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  url: text("url").notNull(),
  label: text("label"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verificationRequestActivityTable = pgTable("verification_request_activity", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id")
    .notNull()
    .references(() => verificationRequestsTable.id, { onDelete: "cascade" }),
  actorAdminId: integer("actor_admin_id"),
  action: text("action").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
