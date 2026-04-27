import { useAuthMe, getAuthMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export function useAuth() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useAuthMe({
    query: {
      queryKey: getAuthMeQueryKey(),
      retry: false,
      staleTime: 30_000,
    },
  });

  const user = isError || !data?.id ? null : data;

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    refresh: () =>
      queryClient.invalidateQueries({ queryKey: getAuthMeQueryKey() }),
  };
}
