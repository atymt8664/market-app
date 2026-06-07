import {
  listConversations,
  useStartConversation,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { prefetchConversationThread } from "@/lib/prefetch-conversation-thread";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/i18n";
import { ApiError } from "@workspace/api-client-react";
import { useCallback, useState } from "react";
import {
  findConversationIdForAd,
  orderChatHref,
} from "./order-chat-nav";

export { findConversationIdForAd, orderChatHref } from "./order-chat-nav";

export function buildOrderChatDraft(orderNumber: string): string {
  return t("p17.commerce.chat.order_created_draft", { orderNumber });
}

export function useOpenOrderChat() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const startConversation = useStartConversation();
  const [isOpening, setIsOpening] = useState(false);

  const open = useCallback(
    (
      adId: number,
      orderNumber: string,
      orderRole?: "buyer" | "seller",
      options?: { withDraft?: boolean },
    ) => {
      const draft =
        options?.withDraft !== false && orderRole !== "seller"
          ? buildOrderChatDraft(orderNumber)
          : undefined;

      void (async () => {
        setIsOpening(true);
        try {
          let conversationId: number;

          if (orderRole === "seller") {
            const conversations = await listConversations();
            const existingId = findConversationIdForAd(conversations, adId);
            if (!existingId) {
              toast({
                title: t("p17.commerce.chat.open_failed"),
                description: t("p17.commerce.chat.seller_no_thread"),
                variant: "destructive",
              });
              return;
            }
            conversationId = existingId;
          } else {
            const data = await startConversation.mutateAsync({ data: { adId } });
            conversationId = data.id;
          }

          await prefetchConversationThread(queryClient, conversationId);
          navigate(orderChatHref(conversationId, orderNumber, orderRole, draft));
        } catch (err: unknown) {
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
        } finally {
          setIsOpening(false);
        }
      })();
    },
    [navigate, queryClient, startConversation, toast],
  );

  return {
    isPending: isOpening || startConversation.isPending,
    open,
  };
}
