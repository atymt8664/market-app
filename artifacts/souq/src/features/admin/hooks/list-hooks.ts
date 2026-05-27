import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getAdminAds } from "../api/ads";
import { getAdminAdsStats, getAdminReportsStats, getAdminSupportStats } from "../api/dashboard";
import { getAdminReports } from "../api/reports";
import { getAdminSupportTickets } from "../api/support";
import { getAdminUsers } from "../api/users";
import {
  getAdminVerificationRequestDetail,
  getAdminVerificationRequests,
  getAdminVerificationStats,
} from "../api/verification";
import { getAdminStaffList } from "../api/staff";

export function useAdminAds(params: {
  status: string;
  q: string;
  queue: string;
  featured: "all" | "true" | "false";
  page: number;
  pageSize: number;
}) {
  return useQuery({
    queryKey: ["admin", "ads", params.status, params.q, params.queue, params.featured, params.page, params.pageSize],
    queryFn: () => getAdminAds(params),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useAdminReports(params: { queue: string; page: number; pageSize: number }) {
  return useQuery({
    queryKey: ["admin", "reports", params.queue, params.page, params.pageSize],
    queryFn: ({ signal }) => getAdminReports({ queue: params.queue, page: params.page, pageSize: params.pageSize }, signal),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useAdminReportsStats(enabled = true) {
  return useQuery({
    queryKey: ["admin", "reports", "stats"],
    queryFn: ({ signal }) => getAdminReportsStats(signal),
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useAdminSupportStats(enabled = true) {
  return useQuery({
    queryKey: ["admin", "support", "stats"],
    queryFn: ({ signal }) => getAdminSupportStats(signal),
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useAdminAdsStats(enabled = true) {
  return useQuery({
    queryKey: ["admin", "ads", "stats"],
    queryFn: ({ signal }) => getAdminAdsStats(signal),
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useAdminSupportTickets(params: {
  status: string;
  q: string;
  queue: string;
  page: number;
  pageSize: number;
}) {
  return useQuery({
    queryKey: ["admin", "support", "tickets", params.status, params.q, params.queue, params.page, params.pageSize],
    queryFn: () => getAdminSupportTickets(params),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useAdminUsers(params: {
  status: string;
  q: string;
  avatarReview?: string;
  page: number;
  pageSize: number;
}) {
  return useQuery({
    queryKey: ["admin", "users", params.status, params.q, params.avatarReview ?? "", params.page, params.pageSize],
    queryFn: () => getAdminUsers(params),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useAdminStaffList(params: { page: number; pageSize: number }, enabled = true) {
  return useQuery({
    queryKey: ["admin", "staff", params.page, params.pageSize],
    queryFn: ({ signal }) => getAdminStaffList({ page: params.page, pageSize: params.pageSize }, signal),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useAdminVerificationStats(enabled = true) {
  return useQuery({
    queryKey: ["admin", "verification", "stats"],
    queryFn: ({ signal }) => getAdminVerificationStats(signal),
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useAdminVerificationRequests(
  params: { queue: string; page: number; pageSize: number },
  enabled = true,
) {
  return useQuery({
    queryKey: ["admin", "verification", "requests", params.queue, params.page, params.pageSize],
    queryFn: ({ signal }) => getAdminVerificationRequests({ queue: params.queue, page: params.page, pageSize: params.pageSize }, signal),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useAdminVerificationDetail(id: number | null, enabled = true) {
  return useQuery({
    queryKey: ["admin", "verification", "detail", id],
    queryFn: ({ signal }) => getAdminVerificationRequestDetail(id!, signal),
    enabled: enabled && id != null && id > 0,
    staleTime: 5_000,
  });
}
