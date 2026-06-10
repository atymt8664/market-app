import type { UserPresenceEntry } from "@workspace/api-client-react";
import { resolveAdDetailSellerPresenceText } from "@/lib/ad-detail-seller-presence-text";
import { cn } from "@/lib/utils";

type AdDetailSellerPresenceBadgeProps = {
  entry: UserPresenceEntry | undefined;
  isLoading?: boolean;
};

/** Ad-detail seller card — compact w-fit badge; never «غير متصل». */
export function AdDetailSellerPresenceBadge({
  entry,
  isLoading,
}: AdDetailSellerPresenceBadgeProps) {
  const presence = resolveAdDetailSellerPresenceText(entry, isLoading);
  if (!presence) return null;

  return (
    <span
      className={cn(
        "inline-flex w-fit max-w-full self-end truncate rounded-full text-[10px] leading-tight",
        presence.kind === "online"
          ? "font-medium text-primary/85"
          : "font-normal text-zinc-500",
      )}
      role="status"
      data-testid="ad-detail-seller-presence"
    >
      {presence.text}
    </span>
  );
}
