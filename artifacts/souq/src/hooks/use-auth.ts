import { useEffect } from "react";
import { ApiError, useAuthMe, getAuthMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const ACCOUNT_DISABLED_CODE = "ACCOUNT_DISABLED";

export function useAuth() {
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, error } = useAuthMe({
    query: {
      queryKey: getAuthMeQueryKey(),
      retry: false,
      staleTime: 30_000,
    },
  });

  useEffect(() => {
    if (!error || !(error instanceof ApiError) || error.status !== 403) return;
    const code = (error.data as { code?: string } | null)?.code;
    if (code === ACCOUNT_DISABLED_CODE) {
      queryClient.removeQueries({ queryKey: getAuthMeQueryKey() });
    }
  }, [error, queryClient]);
  const cached = queryClient.getQueryData(getAuthMeQueryKey()) as
    | (typeof data)
    | undefined;
  const safeData = data ?? cached ?? null;

  /**
   * لا نعتبر `isError` وحده «غير مسجّل» إن بقيت `data` من جلب سابق — يقلّل ومضات Redirect/شاشة فارغة
   * عند تعثّر شبكة عابر بعد العودة من الخلفية.
   */
  const user = safeData?.id ? safeData : null;

  return {
    user,
    /** نؤجل الحراسة حتى حسم auth/me فعلياً لتجنب وميض إعادة التوجيه أثناء refetch. */
    isLoading: (isLoading || isFetching) && !user,
    isAuthenticated: !!user,
    refresh: () =>
      queryClient.invalidateQueries({ queryKey: getAuthMeQueryKey() }),
  };
}
