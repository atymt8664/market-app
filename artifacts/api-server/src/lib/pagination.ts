import type { Response } from "express";
import { and, eq, gt, lt, or, sql, type SQL } from "drizzle-orm";
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
  ADMIN_USERS: { default: 50, max: 100 },
  ADMIN_REPORTS: { default: 50, max: 100 },
  ADMIN_ADS: { default: 50, max: 100 },
  ADMIN_SUPPORT: { default: 50, max: 100 },
  ADMIN_VERIFICATION: { default: 50, max: 100 },
  ADMIN_STAFF: { default: 50, max: 100 },
  ADMIN_CITIES: { default: 500, max: 500 },
  ADMIN_LOGS: { default: 50, max: 100 },
  SOCIAL: { default: 200, max: 200 },
} as const;

export type LimitProfile = { default: number; max: number };

export type DecodedCursor = { at: Date; id: number; /** FTS relevance (Phase 7A.4) */ r?: number };

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

/** Admin list pages — page/size/total headers (P8M-1). */
export type AdminPageMeta = PageMeta & {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};

/** SSOT — all `x-pagination-*` response header names (set + CORS expose derive from here). */
export const PAGINATION_HEADERS = {
  nextCursor: "x-pagination-next-cursor",
  hasMore: "x-pagination-has-more",
  limit: "x-pagination-limit",
  page: "x-pagination-page",
  pageSize: "x-pagination-page-size",
  totalPages: "x-pagination-total-pages",
  totalItems: "x-pagination-total-items",
  hasNext: "x-pagination-has-next",
  hasPrevious: "x-pagination-has-previous",
} as const;

/** CORS Access-Control-Expose-Headers — auto-synced when PAGINATION_HEADERS grows. */
export const PAGINATION_CORS_EXPOSE_HEADERS = Object.values(PAGINATION_HEADERS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Clamp client `limit` to profile bounds (never throws). */
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

/**
 * Normalize `limit` on a query object before Zod parse (avoids .max() validation 500s).
 * Other query keys are left unchanged.
 */
export function sanitizeQueryLimit(
  query: Record<string, unknown>,
  profile: LimitProfile,
): Record<string, unknown> {
  return { ...query, limit: clampLimit(query["limit"], profile) };
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
    const rRaw = parsed["r"];
    const r =
      rRaw === undefined || rRaw === null ? undefined : Number(rRaw);
    if (Number.isNaN(at.getTime()) || !Number.isInteger(id) || id <= 0) {
      return null;
    }
    if (r !== undefined && !Number.isFinite(r)) return null;
    return r !== undefined ? { at, id, r } : { at, id };
  } catch {
    return null;
  }
}

export function encodeCursor(at: Date, id: number, r?: number): string {
  const payload =
    r !== undefined && Number.isFinite(r)
      ? { t: at.toISOString(), id, r }
      : { t: at.toISOString(), id };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function parsePaginationQuery(
  query: Record<string, unknown>,
  profile: LimitProfile,
): ParsedPagination {
  const safeQuery = sanitizeQueryLimit(query, profile);
  const limit = safeQuery["limit"] as number;
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

/** Keyset for `ORDER BY search_rank DESC, created_at DESC, id DESC`. */
export function keysetWhereSearchDesc(
  rankExpr: SQL,
  createdAtCol: AnyColumn,
  idCol: AnyColumn,
  cursor: DecodedCursor & { r: number },
): SQL {
  return or(
    sql`${rankExpr} < ${cursor.r}`,
    and(
      sql`${rankExpr} = ${cursor.r}`,
      lt(createdAtCol, cursor.at),
    ),
    and(
      sql`${rankExpr} = ${cursor.r}`,
      eq(createdAtCol, cursor.at),
      lt(idCol, cursor.id),
    ),
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
  const lastCursor = last ? pickCursor(last) : null;
  const nextCursor =
    hasMore && lastCursor
      ? encodeCursor(lastCursor.at, lastCursor.id, lastCursor.r)
      : null;
  return {
    items,
    meta: { limit, hasMore, nextCursor },
  };
}

export function parseAdminPageQuery(
  query: Record<string, unknown>,
  profile: LimitProfile,
): { page: number; pageSize: number; offset: number } {
  const pageSize = clampLimit(query.pageSize ?? query.limit, profile);
  const pageRaw = query.page;
  let page =
    pageRaw === undefined || pageRaw === null || pageRaw === ""
      ? 1
      : Math.floor(Number(pageRaw));
  if (!Number.isFinite(page) || page < 1) page = 1;
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function buildAdminPageMeta(
  page: number,
  pageSize: number,
  totalItems: number,
  nextCursor: string | null = null,
): AdminPageMeta {
  const totalPages = Math.max(1, Math.ceil(Math.max(0, totalItems) / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const hasNext = safePage < totalPages;
  const hasPrevious = safePage > 1;
  return {
    page: safePage,
    pageSize,
    totalItems: Math.max(0, totalItems),
    totalPages,
    hasNext,
    hasPrevious,
    limit: pageSize,
    hasMore: hasNext,
    nextCursor: hasNext ? nextCursor : null,
  };
}

export function setPaginationHeaders(res: Response, meta: PageMeta): void {
  res.setHeader(PAGINATION_HEADERS.limit, String(meta.limit));
  res.setHeader(PAGINATION_HEADERS.hasMore, meta.hasMore ? "true" : "false");
  if (meta.nextCursor) {
    res.setHeader(PAGINATION_HEADERS.nextCursor, meta.nextCursor);
  }
  if ("page" in meta && typeof (meta as AdminPageMeta).page === "number") {
    const adminMeta = meta as AdminPageMeta;
    res.setHeader(PAGINATION_HEADERS.page, String(adminMeta.page));
    res.setHeader(PAGINATION_HEADERS.pageSize, String(adminMeta.pageSize));
    res.setHeader(PAGINATION_HEADERS.totalPages, String(adminMeta.totalPages));
    res.setHeader(PAGINATION_HEADERS.totalItems, String(adminMeta.totalItems));
    res.setHeader(PAGINATION_HEADERS.hasNext, adminMeta.hasNext ? "true" : "false");
    res.setHeader(PAGINATION_HEADERS.hasPrevious, adminMeta.hasPrevious ? "true" : "false");
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

/** Admin page lists — includes page/total headers (P8M-1). */
export function sendJsonAdminPage(
  res: Response,
  items: unknown[],
  meta: AdminPageMeta,
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
