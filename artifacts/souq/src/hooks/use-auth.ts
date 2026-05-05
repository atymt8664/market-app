import { useAuthMe, getAuthMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export function useAuth() {
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching } = useAuthMe({
    query: {
      queryKey: getAuthMeQueryKey(),
      retry: false,
      staleTime: 30_000,
    },
  });
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
