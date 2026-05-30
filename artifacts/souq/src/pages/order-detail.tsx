import { useParams } from "wouter";
import { OrderDetailPage } from "@/features/p17-commerce/order-detail-page";

export default function OrderDetailRoutePage() {
  const params = useParams<{ id: string }>();
  return <OrderDetailPage variant="buyer" orderId={params.id} />;
}
