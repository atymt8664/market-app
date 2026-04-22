import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

export function formatRelativeTime(dateString: string) {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ar });
  } catch (e) {
    return "";
  }
}

export function formatPrice(price: number | null | undefined, type: string) {
  if (type === "free") return "مجاناً";
  if (type === "swap") return "مقايضة";
  
  if (price == null) return "غير محدد";
  
  const formatted = new Intl.NumberFormat("ar-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);

  if (type === "negotiable") return `${formatted} (قابل للتفاوض)`;
  return formatted;
}
