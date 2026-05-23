import type { Message } from "@workspace/api-client-react";

export function isMessageDeletedForEveryone(m: Message): boolean {
  return Boolean(m.deletedForEveryoneAt);
}
