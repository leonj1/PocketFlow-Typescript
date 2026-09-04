// @vitest-environment node

import { afterEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { createDatabase } from "@/lib/server/db";
import type { GatewayInput, GatewayResult, LlmGateway } from "@/lib/server/gateway";
import { ProviderError } from "@/lib/server/gateway";
import { executePreparedTurn } from "@/lib/server/orchestration";
import { beginTurn, createAgent, createChat, getChatDetail, replaceRoomAgents } from "@/lib/server/repository";

class FakeGateway implements LlmGateway {
  readonly calls: GatewayInput[] = [];
  constructor(private readonly results: Array<GatewayResult | Error>) {}
  async evaluate(input: GatewayInput): Promise<GatewayResult> {
    this.calls.push(structuredClone(input));
    const result = this.results[this.calls.length - 1];
    if (result instanceof Error) throw result;
    return result;
  }
}

describe("sequential room orchestration", () => {
  let db: Database.Database;
  afterEach(() => db?.close());

  function room() {
    db = createDatabase(":memory:");
    const agents = [
      createAgent({ name: "Calculator", description: "Check arithmetic.", model: "openai/gpt-4o-mini" }, db),
      createAgent({ name: "Skeptic", description: "Challenge wrong claims.", model: "anthropic/claude-sonnet-4" }, db),
      createAgent({ name: "Teacher", description: "Add a useful explanation.", model: "google/gemini-2.5-flash" }, db),
    ];
    const chat = createChat("Arithmetic review", db);
    replaceRoomAgents(chat.id, agents.map((agent) => agent.id), db);
    return { agents, chat };
  }

  it("grows context in order and keeps abstentions out of the transcript", async () => {
    const { chat } = room();
    const gateway = new FakeGateway([
      { decision: "respond", content: "The arithmetic is correct." },
      { decision: "abstain", content: null },
      { decision: "respond", content: "It follows from adding two pairs." },
    ]);
    const prepared = beginTurn(chat.id, "I think 2+2=4", crypto.randomUUID(), db)!;
    const result = await executePreparedTurn({ prepared, apiKey: "secret-never-persisted", gateway, db });

    expect(gateway.calls).toHaveLength(3);
    expect(gateway.calls[0].contributions).toEqual([]);
    expect(gateway.calls[1].contributions.map((entry) => entry.content)).toEqual(["The arithmetic is correct."]);
    expect(gateway.calls[2].contributions.map((entry) => entry.content)).toEqual(["The arithmetic is correct."]);
    expect(gateway.calls.every((call) => call.userMessage === "I think 2+2=4")).toBe(true);
    expect(result?.messages.map((message) => message.content)).toEqual([
      "I think 2+2=4",
      "The arithmetic is correct.",
      "It follows from adding two pairs.",
    ]);
    expect(result?.turns[0].evaluations.map((evaluation) => evaluation.status)).toEqual([
      "responded",
      "abstained",
      "responded",
    ]);
    expect(JSON.stringify(getChatDetail(chat.id, db))).not.toContain("secret-never-persisted");
  });

  it("continues after a provider failure and marks a partial turn", async () => {
    const { chat } = room();
    const gateway = new FakeGateway([
      { decision: "respond", content: "First contribution." },
      new ProviderError("rate_limited", "No secret here."),
      { decision: "abstain", content: null },
    ]);
    const prepared = beginTurn(chat.id, "Review this", crypto.randomUUID(), db)!;
    const result = await executePreparedTurn({ prepared, apiKey: "secret", gateway, db });

    expect(gateway.calls).toHaveLength(3);
    expect(result?.turns[0].status).toBe("partial");
    expect(result?.turns[0].evaluations[1].errorCode).toBe("rate_limited");
    expect(gateway.calls[2].contributions).toHaveLength(1);
  });
});
