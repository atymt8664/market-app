import type { UserPresenceEntry } from "@workspace/api-client-react";
import { appInlineStartJustifyClass, appTextAlignClass } from "@/lib/app-text-direction";
import { resolveInboxPresenceText } from "@/lib/chat-inbox-presence-text";
import { cn } from "@/lib/utils";

type ChatInboxPresenceLineProps = {
  entry: UserPresenceEntry | undefined;
  isLoading?: boolean;
  adTitle: string;
  className?: string;
};

/** Inbox-only presence: online or last-seen — never "offline". */
export function ChatInboxPresenceLine({
  entry,
  isLoading,
  adTitle,
  className,
}: ChatInboxPresenceLineProps) {
  const presence = resolveInboxPresenceText(entry, isLoading);
  const trimmedAdTitle = adTitle.trim();
  const textAlign = appTextAlignClass();

  if (!presence && !trimmedAdTitle) return null;

  return (
    <div className={cn("min-w-0 flex flex-col gap-px", textAlign, className)}>
      {presence ? (
        <span
          className={cn(
            "flex min-w-0 items-center gap-1 text-[10px] leading-tight",
            appInlineStartJustifyClass(),
            presence.kind === "online"
              ? "font-medium text-primary/80"
              : "font-normal text-zinc-500",
          )}
          role="status"
          data-testid="inbox-presence-label"
        >
          <span className="relative inline-flex h-1.5 w-1.5 shrink-0 items-center justify-center" aria-hidden>
            {presence.kind === "online" ? (
              <>
                <span className="absolute inline-flex h-1.5 w-1.5 rounded-full bg-primary opacity-40 blur-[1px]" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_1px_hsl(var(--primary)/0.45)]" />
              </>
            ) : (
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-zinc-500 ring-1 ring-zinc-600/80" />
            )}
          </span>
          <span className={cn("block min-w-0 flex-1 truncate", textAlign)}>{presence.text}</span>
        </span>
      ) : null}
      {trimmedAdTitle ? (
        <span
          className={cn(
            "block min-w-0 truncate text-[10px] leading-tight text-muted-foreground/70",
            textAlign,
          )}
        >
          {trimmedAdTitle}
        </span>
      ) : null}
    </div>
  );
}
