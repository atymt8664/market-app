import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation } from "wouter";
import {
  getAdminAds,
  getAdminCategories,
  getAdminCities,
  getAdminDashboard,
  getAdminMe,
  getAdminReports,
  getAdminStats,
  getAdminSupportMessages,
  getAdminSupportTickets,
  getAdminUserDetails,
  getAdminUsers,
} from "./api";
import type { AdminStatsPeriod } from "./types";

export function useAdminMe() {
  return useQuery({
    queryKey: ["admin", "me"],
    queryFn: ({ signal }) => getAdminMe(signal),
    retry: false,
  });
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: ({ signal }) => getAdminDashboard(signal),
    refetchInterval: 20000,
    refetchIntervalInBackground: true,
    staleTime: 10000,
    placeholderData: (previousData) => previousData,
  });
}

export function useAdminStats(period: AdminStatsPeriod) {
  return useQuery({
    queryKey: ["admin", "stats", period],
    queryFn: ({ signal }) => getAdminStats(period, signal),
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    staleTime: 0,
    placeholderData: (previousData) => previousData,
  });
}

export function useAdminCategories(params: { status: string; q: string }) {
  return useQuery({
    queryKey: ["admin", "categories", params.status, params.q],
    queryFn: () => getAdminCategories(params),
  });
}

export function useAdminCities(params: { status: string; q: string; countryCode: string }) {
  return useQuery({
    queryKey: ["admin", "cities", params.status, params.q, params.countryCode],
    queryFn: () => getAdminCities(params),
  });
}

export function useAdminAds(params: {
  status: string;
  q: string;
  featured: "all" | "true" | "false";
}) {
  return useQuery({
    queryKey: ["admin", "ads", params.status, params.q, params.featured],
    queryFn: () => getAdminAds(params),
  });
}

export function useAdminReports() {
  return useQuery({
    queryKey: ["admin", "reports"],
    queryFn: getAdminReports,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
}

export function useAdminSupportTickets(params: { status: string; q: string }) {
  return useQuery({
    queryKey: ["admin", "support", "tickets", params.status, params.q],
    queryFn: () => getAdminSupportTickets(params),
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
}

export function useAdminSupportMessages(ticketId: number | null) {
  return useQuery({
    queryKey: ["admin", "support", "messages", ticketId],
    queryFn: () => getAdminSupportMessages(ticketId!),
    enabled: !!ticketId,
  });
}

export function useAdminUsers(params: { status: string; q: string }) {
  return useQuery({
    queryKey: ["admin", "users", params.status, params.q],
    queryFn: () => getAdminUsers(params),
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
}

export function useAdminUserDetails(userId: number | null) {
  return useQuery({
    queryKey: ["admin", "users", "details", userId],
    queryFn: () => getAdminUserDetails(userId!),
    enabled: !!userId,
  });
}

export function useRequireAdmin() {
  const [, navigate] = useLocation();
  const meQuery = useAdminMe();

  useEffect(() => {
    if (meQuery.isError) {
      navigate("/admin-login");
      return;
    }
    if (meQuery.data && !meQuery.data.isAdmin) {
      navigate("/admin-login");
    }
  }, [meQuery.isError, meQuery.data, navigate]);

  return meQuery;
}
