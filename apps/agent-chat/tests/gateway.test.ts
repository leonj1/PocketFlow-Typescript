// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { gatewayInternals, ProviderError, RequestyGateway, type GatewayInput } from "@/lib/server/gateway";

function input(contributions: GatewayInput["contributions"] = []): GatewayInput {
  return {
    agent: {
      id: "agent-1",
      name: "Clarity editor",
      description: "Improve clarity and pass when no edit is needed.",
      model: "google/gemini-2.5-flash",
      position: 0,
    },
    priorMessages: [],
    userMessage: "hello",
    contributions,
    apiKey: "not-sent-by-this-test",
  };
}

describe("Requesty gateway policy", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("asks the first available panelist to answer greetings instead of passing", () => {
    const [systemMessage] = gatewayInternals.contextMessages(input());

    expect(systemMessage.content).toContain("Act as the primary respondent");
    expect(systemMessage.content).toContain("including greetings");
    expect(systemMessage.content).toContain("takes precedence over role-specific instructions to pass");
  });

  it("asks later panelists to add new signal or abstain", () => {
    const [systemMessage] = gatewayInternals.contextMessages(input([
      { agentId: "agent-0", agentName: "Greeter", content: "Hello! How can I help?" },
    ]));

    expect(systemMessage.content).toContain("Earlier panelists have already answered");
    expect(systemMessage.content).toContain("If they have covered your useful contribution, abstain");
    expect(systemMessage.content).not.toContain("Act as the primary respondent");
  });

  it("turns provider statuses into actionable failure codes", () => {
    expect(gatewayInternals.providerErrorCode(400)).toBe("invalid_request");
    expect(gatewayInternals.providerErrorCode(401)).toBe("invalid_key");
    expect(gatewayInternals.providerErrorCode(404)).toBe("model_unavailable");
    expect(gatewayInternals.providerErrorCode(429)).toBe("rate_limited");
    expect(gatewayInternals.providerErrorCode(503)).toBe("provider_unavailable");
  });

  it("allows each provider attempt to run for five minutes", () => {
    expect(gatewayInternals.requestTimeoutMs).toBe(300_000);
  });

  it("retries a token-limited reasoning response with a larger output budget", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({
        choices: [{
          finish_reason: "length",
          message: { content: null, reasoning_content: "private reasoning is detected but not retained" },
        }],
        usage: {
          prompt_tokens: 2_100,
          completion_tokens: 8_192,
          completion_tokens_details: { reasoning_tokens: 8_192 },
        },
      }))
      .mockResolvedValueOnce(Response.json({
        choices: [{
          finish_reason: "stop",
          message: { content: '{"decision":"respond","content":"The proposed draft is stronger."}' },
        }],
      }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(new RequestyGateway().evaluate(input())).resolves.toEqual({
      decision: "respond",
      content: "The proposed draft is stronger.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstRequest = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    const retryRequest = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(firstRequest.max_tokens).toBe(8_192);
    expect(firstRequest.reasoning_effort).toBe("low");
    expect(retryRequest.messages[0].content).toContain("Retry instruction");
  });

  it("classifies reasoning-only responses without exposing their contents", () => {
    try {
      gatewayInternals.parseCompletion({
        choices: [{
          finish_reason: "stop",
          message: { content: null, reasoning_content: "hidden chain of thought" },
        }],
        usage: { completion_tokens: 321, completion_tokens_details: { reasoning_tokens: 321 } },
      });
      throw new Error("Expected parsing to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError);
      expect((error as ProviderError).code).toBe("reasoning_only");
      expect((error as ProviderError).diagnostics).toMatchObject({
        finishReason: "stop",
        completionTokens: 321,
        reasoningTokens: 321,
        reasoningCharacters: 23,
      });
      expect(JSON.stringify((error as ProviderError).diagnostics)).not.toContain("hidden chain of thought");
    }
  });
});
