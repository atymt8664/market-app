import { useQuery } from "@tanstack/react-query";
import { getAdminMe } from "../api/auth";
import { getAdminSupportMessages } from "../api/support";
import { getAdminStaffDetail, getAdminStaffMeta } from "../api/staff";
import { getAdminUserDetails } from "../api/users";
import { DEFAULT_STAFF_META } from "../staff-meta-defaults";

export function useAdminMe() {
  return useQuery({
    queryKey: ["admin", "me"],
    queryFn: ({ signal }) => getAdminMe(signal),
    retry: false,
  });
}

export function useAdminSupportMessages(ticketId: number | null) {
  return useQuery({
    queryKey: ["admin", "support", "messages", ticketId],
    queryFn: () => getAdminSupportMessages(ticketId!),
    enabled: !!ticketId,
    refetchOnMount: "always",
  });
}

export function useAdminUserDetails(userId: number | null) {
  return useQuery({
    queryKey: ["admin", "users", "details", userId],
    queryFn: () => getAdminUserDetails(userId!),
    enabled: !!userId,
  });
}

export function useAdminStaffDetail(staffId: number | null) {
  return useQuery({
    queryKey: ["admin", "staff", "detail", staffId],
    queryFn: ({ signal }) => getAdminStaffDetail(staffId!, signal),
    enabled: staffId != null && staffId > 0,
  });
}

export function useAdminStaffMeta(enabled = true) {
  return useQuery({
    queryKey: ["admin", "staff", "meta"],
    queryFn: async ({ signal }) => {
      try {
        return await getAdminStaffMeta(signal);
      } catch {
        return DEFAULT_STAFF_META;
      }
    },
    enabled,
    staleTime: 60_000,
  });
}
