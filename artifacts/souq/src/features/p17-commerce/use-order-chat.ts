import { useStartConversation } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { prefetchConversationThread } from "@/lib/prefetch-conversation-thread";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/i18n";
import { ApiError } from "@workspace/api-client-react";

export function orderChatHref(
  conversationId: number,
  orderNumber: string,
  orderRole?: "buyer" | "seller",
  draft?: string,
): string {
  const params = new URLSearchParams({
    from: "order",
    orderNumber,
  });
  if (orderRole === "seller") {
    params.set("orderRole", "seller");
  }
  if (draft && draft.trim().length > 0) {
    params.set("draft", draft);
  }
  return `/messages/${conversationId}?${params.toString()}`;
}

export function buildOrderChatDraft(orderNumber: string): string {
  return t("p17.commerce.chat.order_created_draft", { orderNumber });
}

export function useOpenOrderChat() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const startConversation = useStartConversation();

  return {
    isPending: startConversation.isPending,
    open: (
      adId: number,
      orderNumber: string,
      orderRole?: "buyer" | "seller",
      options?: { withDraft?: boolean },
    ) => {
      const draft =
        options?.withDraft !== false && orderRole !== "seller"
          ? buildOrderChatDraft(orderNumber)
          : undefined;
      startConversation.mutate(
        { data: { adId } },
        {
          onSuccess: async (data) => {
            await prefetchConversationThread(queryClient, data.id);
            navigate(orderChatHref(data.id, orderNumber, orderRole, draft));
          },
          onError: (err: unknown) => {
            if (err instanceof ApiError && err.status === 403) {
              toast({
                title: t("p17.commerce.chat.open_failed"),
                description: err.message || t("message_thread.chat_send_blocked_toast_body"),
                variant: "destructive",
              });
              return;
            }
            toast({
              title: t("p17.commerce.chat.open_failed"),
              description: t("common.try_again"),
              variant: "destructive",
            });
          },
        },
      );
    },
  };
}
