import "server-only";

import { Flow, Node } from "pocketflow";
import type { AgentSnapshot, EvaluationStatus, PriorMessage } from "@/lib/types";
import type { Contribution, GatewayInput, GatewayResult, LlmGateway } from "@/lib/server/gateway";
import { ProviderError } from "@/lib/server/gateway";
import {
  addAgentMessage,
  completeTurn,
  finishEvaluation,
  getChatDetail,
  startEvaluation,
  type PreparedTurn,
} from "@/lib/server/repository";
import type Database from "better-sqlite3";

export type TurnEvent =
  | { type: "agent.started"; agentId: string; agentName: string; position: number }
  | {
      type: "agent.completed";
      agentId: string;
      agentName: string;
      position: number;
      status: Exclude<EvaluationStatus, "running">;
      content: string | null;
      errorCode: string | null;
    }
  | { type: "turn.completed"; status: "completed" | "partial" | "failed" };

type NodeResult =
  | { ok: true; result: GatewayResult; durationMs: number }
  | { ok: false; errorCode: string; durationMs: number };

type TurnShared = {
  prepared: PreparedTurn;
  priorMessages: PriorMessage[];
  contributions: Contribution[];
  gateway: LlmGateway;
  apiKey: string;
  db: Database.Database;
  statuses: Exclude<EvaluationStatus, "running">[];
  onEvent?: (event: TurnEvent) => void | Promise<void>;
};

class AgentTurnNode extends Node<TurnShared> {
  constructor(private readonly agent: AgentSnapshot) {
    super(1);
  }

  async prep(shared: TurnShared): Promise<GatewayInput> {
    await shared.onEvent?.({
      type: "agent.started",
      agentId: this.agent.id,
      agentName: this.agent.name,
      position: this.agent.position,
    });
    return {
      agent: this.agent,
      priorMessages: shared.priorMessages,
      userMessage: shared.prepared.userMessage.content,
      contributions: [...shared.contributions],
      apiKey: shared.apiKey,
    };
  }

  async exec(input: GatewayInput): Promise<NodeResult> {
    const started = performance.now();
    try {
      return { ok: true, result: await this.agentGateway(input), durationMs: Math.round(performance.now() - started) };
    } catch (error) {
      const errorCode = error instanceof ProviderError ? error.code : "internal_error";
      return { ok: false, errorCode, durationMs: Math.round(performance.now() - started) };
    }
  }

  private agentGateway(input: GatewayInput) {
    return this.gateway!.evaluate(input);
  }

  private gateway: LlmGateway | null = null;

  async post(shared: TurnShared, _input: GatewayInput, output: NodeResult) {
    this.gateway = shared.gateway;
    return this.persist(shared, output);
  }

  async _run(shared: TurnShared) {
    this.gateway = shared.gateway;
    return super._run(shared);
  }

  private async persist(shared: TurnShared, output: NodeResult) {
    const evaluationId = startEvaluation(shared.prepared.turn.id, this.agent, shared.db);
    let status: Exclude<EvaluationStatus, "running">;
    let content: string | null = null;
    let errorCode: string | null = null;
    if (!output.ok) {
      status = "failed";
      errorCode = output.errorCode;
    } else if (output.result.decision === "abstain") {
      status = "abstained";
    } else {
      status = "responded";
      content = output.result.content;
      shared.contributions.push({ agentId: this.agent.id, agentName: this.agent.name, content });
      addAgentMessage(shared.prepared, this.agent, content, shared.db);
    }
    finishEvaluation(evaluationId, { status, content, errorCode, durationMs: output.durationMs }, shared.db);
    shared.statuses.push(status);
    await shared.onEvent?.({
      type: "agent.completed",
      agentId: this.agent.id,
      agentName: this.agent.name,
      position: this.agent.position,
      status,
      content,
      errorCode,
    });
    return "default";
  }
}

export async function executePreparedTurn(options: {
  prepared: PreparedTurn;
  apiKey: string;
  gateway: LlmGateway;
  db: Database.Database;
  onEvent?: (event: TurnEvent) => void | Promise<void>;
}) {
  const { prepared, apiKey, gateway, db, onEvent } = options;
  if (prepared.reused) return getChatDetail(prepared.turn.chatId, db);
  if (prepared.agents.length === 0) {
    completeTurn(prepared.turn.id, "completed", db);
    await onEvent?.({ type: "turn.completed", status: "completed" });
    return getChatDetail(prepared.turn.chatId, db);
  }

  const nodes = prepared.agents.map((agent) => new AgentTurnNode(agent));
  for (let index = 0; index < nodes.length - 1; index += 1) nodes[index].next(nodes[index + 1]);
  const statuses: Exclude<EvaluationStatus, "running">[] = [];
  const shared: TurnShared = {
    prepared,
    priorMessages: prepared.priorMessages,
    contributions: [],
    gateway,
    apiKey,
    db,
    statuses,
    onEvent,
  };
  await new Flow(nodes[0]).run(shared);
  const failures = statuses.filter((status) => status === "failed").length;
  const status = failures === 0 ? "completed" : failures === statuses.length ? "failed" : "partial";
  completeTurn(prepared.turn.id, status, db);
  await onEvent?.({ type: "turn.completed", status });
  return getChatDetail(prepared.turn.chatId, db);
}
