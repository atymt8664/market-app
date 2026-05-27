import { useQuery } from "@tanstack/react-query";
import { getAdminNavBadges } from "@/features/admin/api/dashboard";

/** One-shot nav badge counts — no background polling (P8M-1). */
export function useAdminNavBadges(enabled = true) {
  return useQuery({
    queryKey: ["admin", "nav-badges"],
    queryFn: ({ signal }) => getAdminNavBadges(signal),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
  });
}
