import type { Response } from "express";
import { and, eq, gt, lt, or, type SQL } from "drizzle-orm";
import type { AnyColumn } from "drizzle-orm";

/** Hard caps per list endpoint (Phase 7A.2). */
export const PAGINATION = {
  ADS: { default: 50, max: 100 },
  ADS_MINE: { default: 50, max: 100 },
  ADS_ADMIN: { default: 100, max: 100 },
  CONVERSATIONS: { default: 100, max: 100 },
  MESSAGES: { default: 200, max: 200 },
  NOTIFICATIONS: { default: 100, max: 100 },
  SUPPORT_TICKETS: { default: 50, max: 100 },
  SUPPORT_MESSAGES: { default: 100, max: 200 },
  ADMIN_USERS: { default: 100, max: 200 },
  ADMIN_REPORTS: { default: 100, max: 200 },
  ADMIN_CITIES: { default: 500, max: 500 },
  ADMIN_LOGS: { default: 300, max: 300 },
  SOCIAL: { default: 200, max: 200 },
} as const;

export type LimitProfile = { default: number; max: number };

export type DecodedCursor = { at: Date; id: number };

export type ParsedPagination = {
  limit: number;
  fetchLimit: number;
  cursor: DecodedCursor | null;
};

export type PageMeta = {
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
};

const CURSOR_HEADER = "x-pagination-next-cursor";
const HAS_MORE_HEADER = "x-pagination-has-more";
const LIMIT_HEADER = "x-pagination-limit";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Clamp client `limit` to profile bounds. */
export function clampLimit(
  raw: unknown,
  profile: LimitProfile,
): number {
  const n =
    raw === undefined || raw === null || raw === ""
      ? profile.default
      : Number(raw);
  if (!Number.isFinite(n) || n < 1) return profile.default;
  return Math.min(Math.floor(n), profile.max);
}

/** Decode opaque cursor (`base64url` JSON `{ t, id }`). Returns null if absent. */
export function decodeCursor(raw: unknown): DecodedCursor | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const encoded = String(raw).trim();
  if (!encoded) return null;
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    const parsed: unknown = JSON.parse(json);
    if (!isRecord(parsed)) return null;
    const atRaw = parsed["t"];
    const idRaw = parsed["id"];
    const at = new Date(String(atRaw));
    const id = Number(idRaw);
    if (Number.isNaN(at.getTime()) || !Number.isInteger(id) || id <= 0) {
      return null;
    }
    return { at, id };
  } catch {
    return null;
  }
}

export function encodeCursor(at: Date, id: number): string {
  return Buffer.from(
    JSON.stringify({ t: at.toISOString(), id }),
    "utf8",
  ).toString("base64url");
}

export function parsePaginationQuery(
  query: Record<string, unknown>,
  profile: LimitProfile,
): ParsedPagination {
  const limit = clampLimit(query["limit"], profile);
  const cursorRaw = query["cursor"];
  const cursor =
    cursorRaw === undefined || cursorRaw === null || cursorRaw === ""
      ? null
      : decodeCursor(cursorRaw);
  if (cursorRaw !== undefined && cursorRaw !== null && cursorRaw !== "" && !cursor) {
    throw new PaginationError("Invalid cursor");
  }
  return { limit, fetchLimit: limit + 1, cursor };
}

export class PaginationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaginationError";
  }
}

/** Keyset predicate for `ORDER BY created_at DESC, id DESC` (next page = older rows). */
export function keysetWhereDesc(
  createdAtCol: AnyColumn,
  idCol: AnyColumn,
  cursor: DecodedCursor,
): SQL {
  return or(
    lt(createdAtCol, cursor.at),
    and(eq(createdAtCol, cursor.at), lt(idCol, cursor.id)),
  )!;
}

/** Keyset predicate for `ORDER BY created_at ASC, id ASC` (next page = newer rows). */
export function keysetWhereAsc(
  createdAtCol: AnyColumn,
  idCol: AnyColumn,
  cursor: DecodedCursor,
): SQL {
  return or(
    gt(createdAtCol, cursor.at),
    and(eq(createdAtCol, cursor.at), gt(idCol, cursor.id)),
  )!;
}

export function finalizePage<T>(
  rows: T[],
  limit: number,
  pickCursor: (row: T) => DecodedCursor,
): { items: T[]; meta: PageMeta } {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items[items.length - 1];
  const nextCursor =
    hasMore && last ? encodeCursor(pickCursor(last).at, pickCursor(last).id) : null;
  return {
    items,
    meta: { limit, hasMore, nextCursor },
  };
}

export function setPaginationHeaders(res: Response, meta: PageMeta): void {
  res.setHeader(LIMIT_HEADER, String(meta.limit));
  res.setHeader(HAS_MORE_HEADER, meta.hasMore ? "true" : "false");
  if (meta.nextCursor) {
    res.setHeader(CURSOR_HEADER, meta.nextCursor);
  }
}

/** JSON array body unchanged; pagination meta only in headers (backward compatible). */
export function sendJsonArrayPage(
  res: Response,
  items: unknown[],
  meta: PageMeta,
): void {
  setPaginationHeaders(res, meta);
  res.json(items);
}

export function handlePaginationError(
  err: unknown,
  res: Response,
): boolean {
  if (err instanceof PaginationError) {
    res.status(400).json({ error: err.message });
    return true;
  }
  return false;
}
