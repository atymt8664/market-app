import { formatSecurityEventTime } from "@/lib/format";
import { formatSecurityDeviceLabel } from "@/lib/security-event-display";

type LocaleTag = "ar" | "de" | "en";

export function SecurityEventMeta({
  createdAt,
  locale,
  userAgent,
  deviceHint,
  className,
}: {
  createdAt: string;
  locale: string;
  userAgent?: string | null;
  deviceHint?: string | null;
  className?: string;
}) {
  const localeTag: LocaleTag = locale === "ar" ? "ar" : locale === "de" ? "de" : "en";
  const deviceLabel = formatSecurityDeviceLabel({ userAgent, deviceHint });

  return (
    <div className={className ?? "mt-1.5 space-y-1 text-[11px] leading-relaxed text-muted-foreground/80"}>
      {deviceLabel ? <p className="text-muted-foreground/90">{deviceLabel}</p> : null}
      <p>
        <time
          dateTime={createdAt}
          dir="ltr"
          className="inline-block whitespace-nowrap [unicode-bidi:isolate]"
        >
          {formatSecurityEventTime(createdAt, localeTag)}
        </time>
      </p>
    </div>
  );
}
