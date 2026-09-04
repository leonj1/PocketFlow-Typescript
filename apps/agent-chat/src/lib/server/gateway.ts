import "server-only";

import { z } from "zod";
import type { AgentSnapshot, PriorMessage } from "@/lib/types";

export type Contribution = { agentId: string; agentName: string; content: string };

export type GatewayInput = {
  agent: AgentSnapshot;
  priorMessages: PriorMessage[];
  userMessage: string;
  contributions: Contribution[];
  apiKey: string;
};

export type GatewayResult =
  | { decision: "respond"; content: string }
  | { decision: "abstain"; content: null };

type CompletionDiagnostics = {
  finishReason: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  reasoningTokens: number | null;
  reasoningCharacters: number;
};

type CompletionBody = {
  choices?: {
    finish_reason?: string | null;
    message?: { content?: string | null; reasoning_content?: string | null };
  }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    completion_tokens_details?: { reasoning_tokens?: number };
  };
};

export interface LlmGateway {
  evaluate(input: GatewayInput): Promise<GatewayResult>;
}

const resultSchema = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("respond"), content: z.string().trim().min(1) }),
  z.object({ decision: z.literal("abstain"), content: z.null().optional().transform(() => null) }),
]);

function participationContract(hasEarlierContribution: boolean) {
  const turnRole = hasEarlierContribution
    ? `Earlier panelists have already answered this message. Contribute only when you can add a meaningful fact, correction, caveat, useful synthesis, or distinct next step. Do not merely agree, acknowledge, restate, or praise their responses. If they have covered your useful contribution, abstain.`
    : `No earlier panelist has answered this message. Act as the primary respondent: answer the user directly and helpfully, including greetings, conversational messages, and simple confirmations. This primary-response duty takes precedence over role-specific instructions to pass when no specialist correction is needed. Abstain only when you genuinely cannot provide a safe or relevant response.`;
  return `You are one member of an ordered panel evaluating a user's message.
${turnRole}
Return JSON only. Use {"decision":"respond","content":"..."} for a useful response or {"decision":"abstain","content":null} when silence is better.`;
}

function contextMessages(input: GatewayInput, retry = false) {
  const retryInstruction = retry
    ? "\n\nRetry instruction: your previous completion was empty, truncated, or malformed. Return one concise JSON object now. Do not put analysis, markdown, or text outside that object."
    : "";
  const system = `${participationContract(input.contributions.length > 0)}\n\nYour role and system prompt:\n${input.agent.description}${retryInstruction}`;
  const prior = trimContext(input.priorMessages);
  const contributions: PriorMessage[] = input.contributions.map((entry) => ({
    role: "assistant",
    content: `[Earlier panelist: ${entry.agentName}]\n${entry.content}`,
  }));
  return [
    { role: "system" as const, content: system },
    ...prior,
    { role: "user" as const, content: input.userMessage },
    ...contributions,
  ];
}

function trimContext(messages: PriorMessage[], maxCharacters = 48_000) {
  const selected: PriorMessage[] = [];
  let used = 0;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (used + message.content.length > maxCharacters) break;
    selected.unshift(message);
    used += message.content.length;
  }
  return selected;
}

export class ProviderError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly diagnostics?: CompletionDiagnostics,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export class RequestyGateway implements LlmGateway {
  async evaluate(input: GatewayInput): Promise<GatewayResult> {
    let lastError: ProviderError | null = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await this.evaluateAttempt(input, attempt > 0);
      } catch (error) {
        const normalized = normalizeProviderError(error);
        lastError = normalized;
        if (attempt === 0 && RETRYABLE_COMPLETION_ERRORS.has(normalized.code)) continue;
        throw normalized;
      }
    }
    throw lastError ?? new ProviderError("provider_error", "Requesty did not complete the request.");
  }

  private async evaluateAttempt(input: GatewayInput, retry: boolean): Promise<GatewayResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch("https://router.requesty.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json",
          ...(process.env.REQUESTY_SITE_URL ? { "HTTP-Referer": process.env.REQUESTY_SITE_URL } : {}),
          "X-Title": process.env.REQUESTY_APP_NAME ?? "PocketFlow Rooms",
        },
        body: JSON.stringify({
          model: input.agent.model,
          messages: contextMessages(input, retry),
          response_format: { type: "json_object" },
          reasoning_effort: "low",
          temperature: 0.2,
          max_tokens: MAX_OUTPUT_TOKENS,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const code = providerErrorCode(response.status);
        throw new ProviderError(code, `Requesty returned HTTP ${response.status}.`);
      }
      return parseCompletion((await response.json()) as CompletionBody);
    } finally {
      clearTimeout(timeout);
    }
  }
}

const MAX_OUTPUT_TOKENS = 8_192;
const REQUEST_TIMEOUT_MS = 5 * 60 * 1_000;
const RETRYABLE_COMPLETION_ERRORS = new Set(["empty_response", "reasoning_only", "output_limit", "invalid_response"]);

function completionDiagnostics(body: CompletionBody): CompletionDiagnostics {
  const choice = body.choices?.[0];
  const reasoning = choice?.message?.reasoning_content ?? "";
  return {
    finishReason: choice?.finish_reason ?? null,
    promptTokens: body.usage?.prompt_tokens ?? null,
    completionTokens: body.usage?.completion_tokens ?? null,
    reasoningTokens: body.usage?.completion_tokens_details?.reasoning_tokens ?? null,
    reasoningCharacters: reasoning.length,
  };
}

function parseCompletion(body: CompletionBody): GatewayResult {
  const diagnostics = completionDiagnostics(body);
  if (diagnostics.finishReason === "length") {
    throw new ProviderError("output_limit", "The model exhausted its output-token budget.", diagnostics);
  }
  const raw = body.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    const code = diagnostics.reasoningCharacters > 0 ? "reasoning_only" : "empty_response";
    throw new ProviderError(code, "Requesty returned no final answer content.", diagnostics);
  }
  const normalized = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return resultSchema.parse(JSON.parse(normalized));
  } catch {
    throw new ProviderError("invalid_response", "The model did not return the required response format.", diagnostics);
  }
}

function normalizeProviderError(error: unknown) {
  if (error instanceof ProviderError) return error;
  if (error instanceof DOMException && error.name === "AbortError") {
    return new ProviderError("timeout", "The model timed out.");
  }
  return new ProviderError("network_error", "Requesty could not be reached.");
}

function providerErrorCode(status: number) {
  if (status === 400 || status === 422) return "invalid_request";
  if (status === 401) return "invalid_key";
  if (status === 403) return "access_denied";
  if (status === 404) return "model_unavailable";
  if (status === 408) return "timeout";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "provider_unavailable";
  return "provider_error";
}

export async function listRequestyModels(apiKey: string) {
  const response = await fetch("https://router.requesty.ai/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new ProviderError(response.status === 401 ? "invalid_key" : "provider_error", "Models unavailable.");
  const body = (await response.json()) as { data?: { id: string; description?: string }[] };
  return (body.data ?? []).map((model) => ({ id: model.id, description: model.description ?? "" }));
}

export const gatewayInternals = {
  completionDiagnostics,
  contextMessages,
  maxOutputTokens: MAX_OUTPUT_TOKENS,
  requestTimeoutMs: REQUEST_TIMEOUT_MS,
  parseCompletion,
  participationContract,
  providerErrorCode,
  trimContext,
};
