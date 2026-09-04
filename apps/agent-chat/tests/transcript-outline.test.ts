import { describe, expect, it } from "vitest";
import { buildTranscriptOutline, outlineMessageIds } from "@/lib/transcript-outline";
import type { ChatMessage } from "@/lib/types";

function message(overrides: Partial<ChatMessage> & Pick<ChatMessage, "id" | "turnId" | "role">): ChatMessage {
  return {
    chatId: "chat-1",
    content: "text",
    agentId: null,
    agentName: null,
    sequence: 0,
    createdAt: "2026-09-04T10:00:00.000Z",
    ...overrides,
  };
}

describe("transcript outline", () => {
  it("lists every message of an answered turn in transcript order and marks the user's own", () => {
    const groups = buildTranscriptOutline([
      message({ id: "m1", turnId: "t1", role: "user" }),
      message({ id: "m2", turnId: "t1", role: "agent", agentId: "a1", agentName: "John Doe", sequence: 1 }),
      message({ id: "m3", turnId: "t1", role: "agent", agentId: "a2", agentName: "Jane Smith", sequence: 2 }),
    ]);

    expect(groups).toEqual([
      {
        turnId: "t1",
        entries: [
          { messageId: "m1", label: "You", own: true },
          { messageId: "m2", label: "John Doe", own: false },
          { messageId: "m3", label: "Jane Smith", own: false },
        ],
      },
    ]);
  });

  it("omits a turn that drew no agent response and keeps the remaining turns in order", () => {
    const groups = buildTranscriptOutline([
      message({ id: "m1", turnId: "t1", role: "user" }),
      message({ id: "m2", turnId: "t1", role: "agent", agentId: "a1", agentName: "John Doe", sequence: 1 }),
      message({ id: "m3", turnId: "t2", role: "user" }),
      message({ id: "m4", turnId: "t3", role: "user" }),
      message({ id: "m5", turnId: "t3", role: "agent", agentId: "a2", agentName: "Jane Smith", sequence: 1 }),
    ]);

    expect(groups.map((group) => group.turnId)).toEqual(["t1", "t3"]);
    expect(outlineMessageIds(groups)).toEqual(["m1", "m2", "m4", "m5"]);
  });

  it("falls back to Agent when a response carries no agent name", () => {
    const groups = buildTranscriptOutline([
      message({ id: "m1", turnId: "t1", role: "user" }),
      message({ id: "m2", turnId: "t1", role: "agent", agentId: "a1", agentName: null, sequence: 1 }),
    ]);

    expect(groups[0].entries[1]).toEqual({ messageId: "m2", label: "Agent", own: false });
  });

  it("returns no groups for an empty transcript", () => {
    expect(buildTranscriptOutline([])).toEqual([]);
    expect(outlineMessageIds([])).toEqual([]);
  });
});
