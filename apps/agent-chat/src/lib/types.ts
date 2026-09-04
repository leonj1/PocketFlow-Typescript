export type Agent = {
  id: string;
  name: string;
  description: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type ChatSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
};

export type RoomAgent = Agent & { position: number; joinedAt: string };

export type ChatMessage = {
  id: string;
  chatId: string;
  turnId: string;
  role: "user" | "agent";
  content: string;
  agentId: string | null;
  agentName: string | null;
  sequence: number;
  createdAt: string;
};

export type EvaluationStatus = "running" | "responded" | "abstained" | "failed";

export type AgentEvaluation = {
  id: string;
  turnId: string;
  agentId: string;
  agentName: string;
  position: number;
  model: string;
  status: EvaluationStatus;
  content: string | null;
  errorCode: string | null;
  durationMs: number | null;
  createdAt: string;
};

export type ChatTurn = {
  id: string;
  chatId: string;
  clientTurnId: string;
  status: "running" | "completed" | "partial" | "failed";
  createdAt: string;
  completedAt: string | null;
  evaluations: AgentEvaluation[];
};

export type ChatDetail = ChatSummary & {
  roomAgents: RoomAgent[];
  messages: ChatMessage[];
  turns: ChatTurn[];
};

export type AgentSnapshot = {
  id: string;
  name: string;
  description: string;
  model: string;
  position: number;
};

export type PriorMessage = {
  role: "user" | "assistant";
  content: string;
};
