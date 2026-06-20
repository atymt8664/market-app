import {
  listConversations,
  useStartConversation,
} from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { bustConversationThreadCache } from "@/lib/chat-thread-cache";
import { prefetchConversationThread } from "@/lib/prefetch-conversation-thread";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/i18n";
import { resolveUserApiToastFromError } from "@/lib/user-api-errors";
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

          bustConversationThreadCache(queryClient, conversationId);
          await prefetchConversationThread(queryClient, conversationId);
          navigate(orderChatHref(conversationId, orderNumber, orderRole, draft));
        } catch (err: unknown) {
          const payload = resolveUserApiToastFromError(err);
          toast({
            title: t("p17.commerce.chat.open_failed"),
            description: payload.description,
            variant: payload.variant,
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
