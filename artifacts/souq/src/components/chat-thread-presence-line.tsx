import type { UserPresenceEntry } from "@workspace/api-client-react";
import { resolveThreadHeaderPresenceText } from "@/lib/chat-thread-presence-text";
import { cn } from "@/lib/utils";

type ChatThreadPresenceLineProps = {
  entry: UserPresenceEntry | undefined;
  isLoading?: boolean;
  showTyping?: boolean;
  typingLabel: string;
  className?: string;
};

/** Thread header presence — real API/WS data via parent props. */
export function ChatThreadPresenceLine({
  entry,
  isLoading,
  showTyping,
  typingLabel,
  className,
}: ChatThreadPresenceLineProps) {
  if (showTyping) {
    return (
      <div
        className={cn(
          "flex min-h-[14px] min-w-0 items-center gap-1 text-[12px] font-medium leading-[1.2] text-primary/90",
          className,
        )}
        role="status"
        aria-live="polite"
        data-testid="thread-presence-label"
        data-presence-kind="typing"
      >
        <span className="min-w-0 truncate">{typingLabel}</span>
        <span className="inline-flex shrink-0 items-end gap-0.5 pb-0.5" aria-hidden>
          <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-primary [animation-duration:1s] [animation-delay:0ms]" />
          <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-primary/75 [animation-duration:1s] [animation-delay:120ms]" />
          <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-primary/55 [animation-duration:1s] [animation-delay:240ms]" />
        </span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <span
        className={cn(
          "inline-block h-3.5 min-h-[14px] w-28 max-w-full animate-pulse rounded bg-zinc-800/80",
          className,
        )}
        role="status"
        aria-busy="true"
        aria-label="…"
        data-testid="thread-presence-loading"
      />
    );
  }

  const presence = resolveThreadHeaderPresenceText(entry, false);
  if (!presence) {
    return null;
  }

  const isOnline = presence.kind === "online";

  return (
    <span
      className={cn(
        "flex min-h-[14px] min-w-0 items-center gap-1 text-[12px] leading-[1.2]",
        isOnline ? "font-medium text-primary/85" : "text-zinc-500",
        className,
      )}
      role="status"
      data-testid="thread-presence-label"
      data-presence-kind={presence.kind}
    >
      <span
        className={cn(
          "inline-flex h-1.5 w-1.5 shrink-0 rounded-full",
          isOnline
            ? "bg-primary shadow-[0_0_6px_1px_hsl(var(--primary)/0.45)]"
            : "bg-zinc-500 ring-1 ring-zinc-600/80",
        )}
        aria-hidden
      />
      <span className="min-w-0 truncate">{presence.text}</span>
    </span>
  );
}
