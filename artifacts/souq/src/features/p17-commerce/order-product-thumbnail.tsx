import { cn } from "@/lib/utils";
import { getAdImageThumbUrl } from "@/lib/ad-image-url";
import { AdCardNoImagePlaceholder } from "@/components/ad-card-no-image-placeholder";

type OrderProductThumbnailProps = {
  imageUrl?: string | null;
  title: string;
  size?: "sm" | "md" | "lg" | "list" | "detailRow" | "detail" | "xl" | "hero";
  className?: string;
};

const SIZE_CLASS = {
  sm: "h-10 w-10 rounded-xl md:h-11 md:w-11",
  md: "h-12 w-12 rounded-xl md:h-14 md:w-14",
  lg: "h-16 w-16 rounded-2xl md:h-[4.5rem] md:w-[4.5rem]",
  list: "h-[5.5rem] w-[5.5rem] rounded-xl md:h-[6rem] md:w-[6rem]",
  detailRow: "h-[6.5rem] w-[6.5rem] rounded-xl md:h-[7rem] md:w-[7rem]",
  detail: "aspect-[16/10] h-28 w-full rounded-none md:h-32",
  xl: "aspect-[4/3] h-32 w-full rounded-none md:h-36",
  hero: "aspect-[4/3] h-40 w-full rounded-none md:h-44",
} as const;

const PLACEHOLDER_COMPACT = new Set<OrderProductThumbnailProps["size"]>(["sm", "md", "lg", "list", "detailRow"]);

export function OrderProductThumbnail({
  imageUrl,
  title,
  size = "sm",
  className,
}: OrderProductThumbnailProps) {
  const resolved = imageUrl?.trim() ? getAdImageThumbUrl(imageUrl.trim()) : null;
  const placeholderCompact = PLACEHOLDER_COMPACT.has(size);

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden border border-primary/30 bg-[#0A0A0A]",
        SIZE_CLASS[size],
        className,
      )}
      aria-hidden={!resolved}
      role={resolved ? undefined : "img"}
      aria-label={resolved ? undefined : title}
    >
      {resolved ? (
        <img
          src={resolved}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <AdCardNoImagePlaceholder plainBackdrop compact={placeholderCompact} subtleIcon className="rounded-none" />
      )}
    </div>
  );
}
