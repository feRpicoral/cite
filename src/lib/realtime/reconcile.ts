export const UUID_RE = /^[0-9a-f-]{36}$/;

interface ReconcilableMessage {
  id: string;
  role: string;
  parts: { type: string }[];
}

function messageText(message: { parts: { type: string }[] }): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

/**
 * Finds the local message a persisted INSERT should be grafted onto.
 *
 * Only an optimistic message whose id is still a stream id (not yet a real
 * UUID) is eligible, so an already-persisted bubble is never re-keyed. When
 * the same role+content repeats (e.g. "ok" sent twice), the most recent
 * unpersisted match wins, matching the order the inserts arrive in.
 *
 * Returns -1 when no local message should be rewritten and the insert should
 * be appended instead.
 */
export function findReconcilableMessageIndex(
  messages: ReconcilableMessage[],
  incoming: { role: string; content: string },
): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]!;
    if (message.role !== incoming.role) continue;
    if (UUID_RE.test(message.id)) continue;
    if (messageText(message) === incoming.content) return i;
  }
  return -1;
}
