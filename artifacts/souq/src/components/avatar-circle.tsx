import { User } from "lucide-react";

interface AvatarCircleProps {
  name?: string | null;
  src?: string | null;
  size?: number;
  className?: string;
}

export function AvatarCircle({
  name,
  src,
  size = 80,
  className = "",
}: AvatarCircleProps) {
  const initial = (name ?? "").trim().charAt(0).toUpperCase();
  const style = { width: size, height: size };
  if (src) {
    return (
      <div
        style={style}
        className={`rounded-full overflow-hidden bg-muted shrink-0 ${className}`}
      >
        <img
          src={src}
          alt={name ?? ""}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
  return (
    <div
      style={style}
      className={`rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center font-bold shrink-0 shadow-lg ${className}`}
    >
      {initial ? (
        <span style={{ fontSize: Math.round(size * 0.38) }}>{initial}</span>
      ) : (
        <User style={{ width: size * 0.5, height: size * 0.5 }} />
      )}
    </div>
  );
}
