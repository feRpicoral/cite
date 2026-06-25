import { describe, expect, it } from "vitest";

import { findReconcilableMessageIndex } from "./reconcile";

function streamMessage(id: string, role: string, text: string) {
  return { id, role, parts: [{ type: "text", text }] };
}

const UUID = "11111111-2222-4333-8444-555555555555";
const UUID_2 = "99999999-2222-4333-8444-555555555555";

describe("findReconcilableMessageIndex", () => {
  it("matches a still-optimistic message by role and content", () => {
    const messages = [streamMessage("stream-1", "user", "ok")];

    const index = findReconcilableMessageIndex(messages, { role: "user", content: "ok" });

    expect(index).toBe(0);
  });

  it("does not re-key a message that already holds a real UUID", () => {
    const messages = [streamMessage(UUID, "user", "ok")];

    const index = findReconcilableMessageIndex(messages, { role: "user", content: "ok" });

    expect(index).toBe(-1);
  });

  it("keeps a persisted bubble and rewrites the later optimistic duplicate", () => {
    const messages = [streamMessage(UUID, "user", "ok"), streamMessage("stream-2", "user", "ok")];

    const index = findReconcilableMessageIndex(messages, { role: "user", content: "ok" });

    expect(index).toBe(1);
  });

  it("prefers the most recent optimistic match when content repeats", () => {
    const messages = [
      streamMessage("stream-1", "user", "ok"),
      streamMessage("stream-2", "user", "ok"),
    ];

    const index = findReconcilableMessageIndex(messages, { role: "user", content: "ok" });

    expect(index).toBe(1);
  });

  it("ignores messages of a different role", () => {
    const messages = [streamMessage("stream-1", "assistant", "ok")];

    const index = findReconcilableMessageIndex(messages, { role: "user", content: "ok" });

    expect(index).toBe(-1);
  });

  it("returns -1 when every matching message is already persisted", () => {
    const messages = [streamMessage(UUID, "user", "ok"), streamMessage(UUID_2, "user", "ok")];

    const index = findReconcilableMessageIndex(messages, { role: "user", content: "ok" });

    expect(index).toBe(-1);
  });

  it("joins multiple text parts before comparing", () => {
    const messages = [
      {
        id: "stream-1",
        role: "assistant",
        parts: [
          { type: "text", text: "hel" },
          { type: "step-start" },
          { type: "text", text: "lo" },
        ],
      },
    ];

    const index = findReconcilableMessageIndex(messages, { role: "assistant", content: "hello" });

    expect(index).toBe(0);
  });
});
