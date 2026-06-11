import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdminBroadcastDraft,
  getAdminBroadcasts,
  previewAdminBroadcast,
  sendAdminBroadcast,
  type BroadcastAudience,
  type BroadcastCategory,
  type BroadcastRow,
} from "../api/broadcasts";

export const adminBroadcastsQueryKey = ["admin", "broadcasts", "list"] as const;

export function useAdminBroadcastsQuery(enabled = true) {
  return useQuery({
    queryKey: adminBroadcastsQueryKey,
    queryFn: ({ signal }) => getAdminBroadcasts(signal),
    enabled,
    staleTime: 10_000,
    refetchInterval: (query) => {
      const rows = query.state.data as BroadcastRow[] | undefined;
      if (rows?.some((r) => r.status === "sending")) return 3_000;
      return false;
    },
    retry: false,
  });
}

export function usePreviewBroadcastMutation() {
  return useMutation({
    mutationFn: (input: {
      category: BroadcastCategory;
      title: string;
      body: string;
      audience: BroadcastAudience;
    }) => previewAdminBroadcast(input),
  });
}

export function useCreateBroadcastMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAdminBroadcastDraft,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminBroadcastsQueryKey });
    },
  });
}

export function useSendBroadcastMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, confirmToken }: { id: number; confirmToken: string }) =>
      sendAdminBroadcast(id, confirmToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminBroadcastsQueryKey });
    },
  });
}
