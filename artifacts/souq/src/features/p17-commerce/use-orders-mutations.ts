import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  acceptSellerOrder,
  cancelBuyerOrder,
  createBuyerOrder,
  markShippedSellerOrder,
  rejectSellerOrder,
  startPreparingSellerOrder,
} from "./orders-api-client";
import {
  BUYER_ORDERS_QUERY_KEY,
  ORDERS_STATS_QUERY_KEY,
  SELLER_ORDERS_QUERY_KEY,
  type CreateOrderBody,
} from "./orders-api.types";
import { orderDetailQueryKey, orderTimelineQueryKey } from "./orders-api.types";

export function useCreateBuyerOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      body,
      idempotencyKey,
    }: {
      body: CreateOrderBody;
      idempotencyKey: string;
    }) => createBuyerOrder(body, idempotencyKey),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: BUYER_ORDERS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ORDERS_STATS_QUERY_KEY });
      const num = data.order.orderNumber;
      void queryClient.invalidateQueries({
        queryKey: orderDetailQueryKey("buyer", num),
      });
      void queryClient.invalidateQueries({
        queryKey: orderTimelineQueryKey(num),
      });
    },
  });
}

export function useCancelBuyerOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderNumber: string) => cancelBuyerOrder(orderNumber),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: BUYER_ORDERS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ORDERS_STATS_QUERY_KEY });
      const num = data.order.orderNumber;
      void queryClient.invalidateQueries({
        queryKey: orderDetailQueryKey("buyer", num),
      });
      void queryClient.invalidateQueries({
        queryKey: orderTimelineQueryKey(num),
      });
    },
  });
}

function invalidateSellerOrderQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  orderNumber: string,
) {
  void queryClient.invalidateQueries({ queryKey: SELLER_ORDERS_QUERY_KEY });
  void queryClient.invalidateQueries({
    queryKey: orderDetailQueryKey("seller", orderNumber),
  });
  void queryClient.invalidateQueries({
    queryKey: orderTimelineQueryKey(orderNumber),
  });
}

export function useAcceptSellerOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderNumber: string) => acceptSellerOrder(orderNumber),
    onSuccess: (data) => {
      invalidateSellerOrderQueries(queryClient, data.order.orderNumber);
    },
  });
}

export function useRejectSellerOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderNumber: string) => rejectSellerOrder(orderNumber),
    onSuccess: (data) => {
      invalidateSellerOrderQueries(queryClient, data.order.orderNumber);
    },
  });
}

export function useStartPreparingOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderNumber: string) => startPreparingSellerOrder(orderNumber),
    onSuccess: (data) => {
      invalidateSellerOrderQueries(queryClient, data.order.orderNumber);
      void queryClient.invalidateQueries({
        queryKey: orderDetailQueryKey("buyer", data.order.orderNumber),
      });
    },
  });
}

export function useMarkShippedOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { orderNumber: string; carrierLabel: string; trackingNumber: string }) =>
      markShippedSellerOrder(input.orderNumber, {
        carrierLabel: input.carrierLabel,
        trackingNumber: input.trackingNumber,
      }),
    onSuccess: (data) => {
      invalidateSellerOrderQueries(queryClient, data.order.orderNumber);
      void queryClient.invalidateQueries({
        queryKey: orderDetailQueryKey("buyer", data.order.orderNumber),
      });
    },
  });
}
