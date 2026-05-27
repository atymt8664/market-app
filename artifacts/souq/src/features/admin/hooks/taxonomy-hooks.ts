import { useQuery } from "@tanstack/react-query";
import { getAdminCategories, getAdminCities } from "../api/taxonomy";

export function useAdminCategories(params: { status: string; q: string }) {
  return useQuery({
    queryKey: ["admin", "categories", params.status, params.q],
    queryFn: () => getAdminCategories(params),
    refetchOnMount: "always",
  });
}

export function useAdminCities(params: { status: string; q: string; countryCode: string }) {
  return useQuery({
    queryKey: ["admin", "cities", params.status, params.q, params.countryCode],
    queryFn: () => getAdminCities(params),
    refetchOnMount: "always",
  });
}
