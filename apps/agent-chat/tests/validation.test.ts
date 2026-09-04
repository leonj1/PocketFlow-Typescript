import { describe, expect, it } from "vitest";
import { agentInputSchema, membershipSchema, turnInputSchema } from "@/lib/validation";

describe("request validation", () => {
  it("accepts a canonical Requesty agent definition", () => {
    expect(agentInputSchema.parse({
      name: "Reviewer",
      description: "Find consequential omissions.",
      model: "anthropic/claude-sonnet-4",
    })).toEqual({ name: "Reviewer", description: "Find consequential omissions.", model: "anthropic/claude-sonnet-4" });
  });

  it("rejects bare model names and duplicate room agents", () => {
    expect(() => agentInputSchema.parse({ name: "A", description: "B", model: "gpt-4o" })).toThrow();
    const id = crypto.randomUUID();
    expect(() => membershipSchema.parse({ agentIds: [id, id] })).toThrow();
  });

  it("requires a UUID idempotency key and nonempty prompt", () => {
    expect(() => turnInputSchema.parse({ content: " ", clientTurnId: "again" })).toThrow();
  });

  it("accepts chat messages up to 50,000 characters", () => {
    const clientTurnId = "6996ce89-b6be-49fc-b88e-0a6dfb87b08c";

    expect(turnInputSchema.parse({ content: "x".repeat(50_000), clientTurnId }).content).toHaveLength(50_000);
    expect(() => turnInputSchema.parse({ content: "x".repeat(50_001), clientTurnId })).toThrow(
      "Keep messages under 50,000 characters.",
    );
  });
});
