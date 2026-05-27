/** Admin list pagination from X-Pagination-* response headers (P8M-1). */

export type AdminPaginationMeta = {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrevious: boolean;
  nextCursor: string | null;
};

export type AdminPaginatedResult<T> = {
  items: T[];
  pagination: AdminPaginationMeta;
};

const DEFAULT_META: AdminPaginationMeta = {
  page: 1,
  pageSize: 50,
  totalPages: 1,
  totalItems: 0,
  hasNext: false,
  hasPrevious: false,
  nextCursor: null,
};

function readHeaderInt(res: Response, name: string, fallback: number): number {
  const raw = res.headers.get(name);
  const n = raw != null ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function readHeaderBool(res: Response, name: string): boolean {
  return res.headers.get(name) === "true";
}

export function parseAdminPaginationHeaders(res: Response): AdminPaginationMeta {
  const page = readHeaderInt(res, "x-pagination-page", 1);
  const pageSize = readHeaderInt(res, "x-pagination-page-size", readHeaderInt(res, "x-pagination-limit", 50));
  const totalPages = readHeaderInt(res, "x-pagination-total-pages", 1);
  const totalItems = readHeaderInt(res, "x-pagination-total-items", 0);
  const hasNext = readHeaderBool(res, "x-pagination-has-next") || res.headers.get("x-pagination-has-more") === "true";
  const hasPrevious = readHeaderBool(res, "x-pagination-has-previous");
  const nextCursor = res.headers.get("x-pagination-next-cursor");
  return {
    page: Math.max(1, page),
    pageSize: Math.max(1, pageSize),
    totalPages: Math.max(1, totalPages),
    totalItems: Math.max(0, totalItems),
    hasNext,
    hasPrevious,
    nextCursor: nextCursor?.trim() || null,
  };
}

export async function parseAdminPaginatedJson<T>(res: Response): Promise<AdminPaginatedResult<T>> {
  const pagination = parseAdminPaginationHeaders(res);
  const items = (await res.json()) as T[];
  return { items, pagination };
}

export function emptyAdminPaginatedResult<T>(): AdminPaginatedResult<T> {
  return { items: [], pagination: { ...DEFAULT_META } };
}

export const ADMIN_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
