import { useParams } from "wouter";
import { OrderDetailPage } from "@/features/p17-commerce/order-detail-page";

export default function SellerOrderDetailRoutePage() {
  const params = useParams<{ id: string }>();
  return <OrderDetailPage variant="seller" orderId={params.id} />;
}
