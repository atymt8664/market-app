import type { AdminCategory, AdminCitiesResponse } from "../types";
import { apiUrl } from "@/lib/api-url";
import { apiGet, getAdminMutationHeaders, throwAdminMutationError } from "./client";

export async function getAdminCategories(params: { q?: string; status?: string }) {
  const search = new URLSearchParams();
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.status && params.status !== "all") search.set("status", params.status);
  const qs = search.toString();
  return apiGet<AdminCategory[]>(`/api/admin/categories${qs ? `?${qs}` : ""}`);
}

export async function createAdminCategory(payload: {
  type: "category" | "subcategory";
  name: string;
  slug?: string;
  icon?: string;
  subtitle?: string;
  sortOrder?: number;
  categoryId?: number;
}) {
  const res = await fetch(apiUrl("/api/admin/categories"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) await throwAdminMutationError(res, "p8.admin.api_errors.category_create");
  return res.json();
}

export async function updateAdminCategory(
  id: number,
  payload: {
    type: "category" | "subcategory";
    name?: string;
    slug?: string;
    icon?: string;
    subtitle?: string;
    sortOrder?: number;
    isHidden?: boolean;
    categoryId?: number;
  },
) {
  const res = await fetch(apiUrl(`/api/admin/categories/${id}`), {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) await throwAdminMutationError(res, "p8.admin.api_errors.category_update");
  return res.json();
}

export async function deleteAdminCategory(id: number, type: "category" | "subcategory") {
  const res = await fetch(apiUrl(`/api/admin/categories/${id}?type=${type}`), {
    method: "DELETE",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
  });
  if (!res.ok) await throwAdminMutationError(res, "p8.admin.api_errors.category_delete");
}

export async function getAdminCities(params: {
  q?: string;
  status?: string;
  countryCode?: string;
}) {
  const search = new URLSearchParams();
  if (params.q?.trim()) search.set("q", params.q.trim());
  if (params.status && params.status !== "all") search.set("status", params.status);
  if (params.countryCode && params.countryCode !== "all") {
    search.set("countryCode", params.countryCode.toUpperCase());
  }
  const qs = search.toString();
  return apiGet<AdminCitiesResponse>(`/api/admin/cities${qs ? `?${qs}` : ""}`);
}

export async function createAdminCity(payload: {
  name: string;
  countryCode: string;
  countryName: string;
}) {
  const res = await fetch(apiUrl("/api/admin/cities"), {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) await throwAdminMutationError(res, "p8.admin.api_errors.city_create");
  return res.json();
}

export async function updateAdminCity(
  id: number,
  payload: {
    name?: string;
    countryCode?: string;
    countryName?: string;
    isHidden?: boolean;
  },
) {
  const res = await fetch(apiUrl(`/api/admin/cities/${id}`), {
    method: "PATCH",
    credentials: "include",
    cache: "no-store",
    headers: getAdminMutationHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) await throwAdminMutationError(res, "p8.admin.api_errors.city_update");
  return res.json();
}
