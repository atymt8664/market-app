import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  acceptSellerOrder,
  cancelBuyerOrder,
  createBuyerOrder,
  markShippedSellerOrder,
  rejectSellerOrder,
  startPreparingSellerOrder,
} from "./orders-api-client";
import {
  buyerOrdersQueryKey,
  orderDetailQueryKey,
  orderTimelineQueryKey,
  ordersStatsQueryKey,
  sellerOrdersQueryKey,
  type CreateOrderBody,
} from "./orders-api.types";

export function useCreateBuyerOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  return useMutation({
    mutationFn: ({
      body,
      idempotencyKey,
    }: {
      body: CreateOrderBody;
      idempotencyKey: string;
    }) => createBuyerOrder(body, idempotencyKey),
    onSuccess: (data) => {
      if (!userId) return;
      void queryClient.invalidateQueries({ queryKey: buyerOrdersQueryKey(userId) });
      void queryClient.invalidateQueries({ queryKey: ordersStatsQueryKey(userId) });
      const num = data.order.orderNumber;
      void queryClient.invalidateQueries({
        queryKey: orderDetailQueryKey(userId, "buyer", num),
      });
      void queryClient.invalidateQueries({
        queryKey: orderTimelineQueryKey(userId, num),
      });
    },
  });
}

export function useCancelBuyerOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  return useMutation({
    mutationFn: (orderNumber: string) => cancelBuyerOrder(orderNumber),
    onSuccess: (data) => {
      if (!userId) return;
      void queryClient.invalidateQueries({ queryKey: buyerOrdersQueryKey(userId) });
      void queryClient.invalidateQueries({ queryKey: ordersStatsQueryKey(userId) });
      const num = data.order.orderNumber;
      void queryClient.invalidateQueries({
        queryKey: orderDetailQueryKey(userId, "buyer", num),
      });
      void queryClient.invalidateQueries({
        queryKey: orderTimelineQueryKey(userId, num),
      });
    },
  });
}

function invalidateBuyerOrderQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: number,
  orderNumber: string,
) {
  void queryClient.invalidateQueries({ queryKey: buyerOrdersQueryKey(userId) });
  void queryClient.invalidateQueries({
    queryKey: orderDetailQueryKey(userId, "buyer", orderNumber),
  });
  void queryClient.invalidateQueries({
    queryKey: orderTimelineQueryKey(userId, orderNumber),
  });
}

function invalidateSellerOrderQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: number,
  orderNumber: string,
) {
  void queryClient.invalidateQueries({ queryKey: sellerOrdersQueryKey(userId) });
  void queryClient.invalidateQueries({
    queryKey: orderDetailQueryKey(userId, "seller", orderNumber),
  });
  void queryClient.invalidateQueries({
    queryKey: orderTimelineQueryKey(userId, orderNumber),
  });
}

export function useAcceptSellerOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  return useMutation({
    mutationFn: (orderNumber: string) => acceptSellerOrder(orderNumber),
    onSuccess: (data) => {
      if (!userId) return;
      invalidateSellerOrderQueries(queryClient, userId, data.order.orderNumber);
      invalidateBuyerOrderQueries(queryClient, data.order.buyerUserId, data.order.orderNumber);
    },
  });
}

export function useRejectSellerOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  return useMutation({
    mutationFn: (orderNumber: string) => rejectSellerOrder(orderNumber),
    onSuccess: (data) => {
      if (!userId) return;
      invalidateSellerOrderQueries(queryClient, userId, data.order.orderNumber);
      invalidateBuyerOrderQueries(queryClient, data.order.buyerUserId, data.order.orderNumber);
    },
  });
}

export function useStartPreparingOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  return useMutation({
    mutationFn: (orderNumber: string) => startPreparingSellerOrder(orderNumber),
    onSuccess: (data) => {
      if (!userId) return;
      invalidateSellerOrderQueries(queryClient, userId, data.order.orderNumber);
      invalidateBuyerOrderQueries(queryClient, data.order.buyerUserId, data.order.orderNumber);
    },
  });
}

export function useMarkShippedOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;
  return useMutation({
    mutationFn: (input: { orderNumber: string; carrierLabel: string; trackingNumber: string }) =>
      markShippedSellerOrder(input.orderNumber, {
        carrierLabel: input.carrierLabel,
        trackingNumber: input.trackingNumber,
      }),
    onSuccess: (data) => {
      if (!userId) return;
      invalidateSellerOrderQueries(queryClient, userId, data.order.orderNumber);
      invalidateBuyerOrderQueries(queryClient, data.order.buyerUserId, data.order.orderNumber);
    },
  });
}
