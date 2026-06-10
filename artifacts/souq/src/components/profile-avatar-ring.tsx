/**
 * Profile avatar — circular lime glow ring + image or initial fallback.
 * Matches profile / public profile pages; reusable at any size.
 */
import { AvatarCircle } from "@/components/avatar-circle";
import { cn } from "@/lib/utils";

const RING_CLASS =
  "shrink-0 rounded-full p-[3px] shadow-[0_0_16px_-4px_rgba(182,227,86,0.28)]";

type ProfileAvatarRingProps = {
  name?: string | null;
  src?: string | null;
  size?: number;
  className?: string;
};

export function ProfileAvatarRing({
  name,
  src,
  size = 80,
  className,
}: ProfileAvatarRingProps) {
  return (
    <div
      className={cn(RING_CLASS, className)}
      style={{
        background:
          "linear-gradient(145deg, rgba(182,227,86,0.5), rgba(182,227,86,0.08))",
      }}
    >
      <div className="rounded-full bg-black p-[2px]">
        <AvatarCircle name={name} src={src} size={size} />
      </div>
    </div>
  );
}
