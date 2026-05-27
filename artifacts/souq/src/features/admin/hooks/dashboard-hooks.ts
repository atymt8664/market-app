import { useQuery, isCancelledError, keepPreviousData } from "@tanstack/react-query";
import {
  getAdminActiveAppUsersCount,
  getAdminDashboard,
  getAdminFounderOperations,
  getAdminMonitoring,
  getAdminStats,
} from "../api/dashboard";
import type { AdminStatsPeriod } from "../types";

/** Live count — dashboard only, 45s polling (P8M-1). */
export function useAdminActiveAppUsersCount(enabled: boolean) {
  return useQuery({
    queryKey: ["admin", "activeAppUsersCount"],
    queryFn: ({ signal }) => getAdminActiveAppUsersCount(signal),
    enabled,
    refetchInterval: 45_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      if (isCancelledError(error)) return false;
      return failureCount < 1;
    },
    retryDelay: 1500,
  });
}

/** Dashboard NOC — polling only on /admin (P8M-1). */
export function useAdminDashboard(enabled = true) {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: ({ signal }) => getAdminDashboard(signal),
    enabled,
    refetchInterval: enabled ? 45_000 : false,
    refetchIntervalInBackground: false,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    structuralSharing: false,
  });
}

export function useAdminStats(period: AdminStatsPeriod, enabled = true) {
  return useQuery({
    queryKey: ["admin", "stats", period],
    queryFn: ({ signal }) => getAdminStats(period, signal),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    structuralSharing: false,
  });
}

export function useAdminFounderOperations(enabled = true) {
  return useQuery({
    queryKey: ["admin", "operations", "founder"],
    queryFn: ({ signal }) => getAdminFounderOperations(signal),
    enabled,
    refetchInterval: enabled ? 25_000 : false,
    refetchIntervalInBackground: false,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useAdminMonitoring(enabled = true) {
  return useQuery({
    queryKey: ["admin", "monitoring"],
    queryFn: ({ signal }) => getAdminMonitoring(signal),
    enabled,
    refetchInterval: enabled ? 20_000 : false,
    refetchIntervalInBackground: false,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    structuralSharing: false,
  });
}
