import type { ChatMessage } from "@/lib/types";

export type OutlineEntry = {
  messageId: string;
  label: string;
  own: boolean;
};

export type OutlineGroup = {
  turnId: string;
  entries: OutlineEntry[];
};

function entryFor(message: ChatMessage): OutlineEntry {
  return {
    messageId: message.id,
    label: message.role === "user" ? "You" : message.agentName ?? "Agent",
    own: message.role === "user",
  };
}

function groupFor(turnId: string, messages: readonly ChatMessage[]): OutlineGroup[] {
  const answered = messages.some((message) => message.role === "agent");
  if (!answered) return [];
  return [{ turnId, entries: messages.map(entryFor) }];
}

function turnsInOrder(messages: readonly ChatMessage[]): Map<string, ChatMessage[]> {
  const byTurn = new Map<string, ChatMessage[]>();
  for (const message of messages) {
    const collected = byTurn.get(message.turnId);
    if (collected) collected.push(message);
    else byTurn.set(message.turnId, [message]);
  }
  return byTurn;
}

export function buildTranscriptOutline(messages: readonly ChatMessage[]): OutlineGroup[] {
  const byTurn = turnsInOrder(messages);
  return [...byTurn.entries()].flatMap(([turnId, turnMessages]) => groupFor(turnId, turnMessages));
}

export function outlineMessageIds(groups: readonly OutlineGroup[]): string[] {
  return groups.flatMap((group) => group.entries.map((entry) => entry.messageId));
}
