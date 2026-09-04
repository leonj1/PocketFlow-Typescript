import "server-only";

import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/server/db";
import type {
  Agent,
  AgentEvaluation,
  AgentSnapshot,
  ChatDetail,
  ChatMessage,
  ChatSummary,
  ChatTurn,
  EvaluationStatus,
  PriorMessage,
  RoomAgent,
} from "@/lib/types";

type AgentRow = {
  id: string;
  name: string;
  description: string;
  model: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

type ChatRow = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
};

type RoomAgentRow = AgentRow & { position: number; joined_at: string };
type MessageRow = {
  id: string;
  chat_id: string;
  turn_id: string;
  role: "user" | "agent";
  content: string;
  agent_id: string | null;
  agent_name: string | null;
  sequence: number;
  created_at: string;
};
type EvaluationRow = {
  id: string;
  turn_id: string;
  agent_id: string;
  agent_name: string;
  position: number;
  model_snapshot: string;
  status: EvaluationStatus;
  content: string | null;
  error_code: string | null;
  duration_ms: number | null;
  created_at: string;
};
type TurnRow = {
  id: string;
  chat_id: string;
  client_turn_id: string;
  status: ChatTurn["status"];
  created_at: string;
  completed_at: string | null;
};

function mapAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    model: row.model,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
  };
}

function mapMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    chatId: row.chat_id,
    turnId: row.turn_id,
    role: row.role,
    content: row.content,
    agentId: row.agent_id,
    agentName: row.agent_name,
    sequence: row.sequence,
    createdAt: row.created_at,
  };
}

function mapEvaluation(row: EvaluationRow): AgentEvaluation {
  return {
    id: row.id,
    turnId: row.turn_id,
    agentId: row.agent_id,
    agentName: row.agent_name,
    position: row.position,
    model: row.model_snapshot,
    status: row.status,
    content: row.content,
    errorCode: row.error_code,
    durationMs: row.duration_ms,
    createdAt: row.created_at,
  };
}

function mapTurn(row: TurnRow, evaluations: AgentEvaluation[] = []): ChatTurn {
  return {
    id: row.id,
    chatId: row.chat_id,
    clientTurnId: row.client_turn_id,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    evaluations,
  };
}

export function getAgents(db = getDatabase(), includeArchived = false): Agent[] {
  const where = includeArchived ? "" : "WHERE archived_at IS NULL";
  const rows = db.prepare(`SELECT * FROM agents ${where} ORDER BY created_at DESC`).all() as AgentRow[];
  return rows.map(mapAgent);
}

export function getAgent(id: string, db = getDatabase()): Agent | null {
  const row = db.prepare("SELECT * FROM agents WHERE id = ?").get(id) as AgentRow | undefined;
  return row ? mapAgent(row) : null;
}

export function createAgent(
  input: { name: string; description: string; model: string },
  db = getDatabase(),
): Agent {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO agents (id, name, description, model, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(id, input.name, input.description, input.model, now, now);
  return getAgent(id, db)!;
}

export function updateAgent(
  id: string,
  input: { name: string; description: string; model: string },
  db = getDatabase(),
): Agent | null {
  const result = db
    .prepare("UPDATE agents SET name = ?, description = ?, model = ?, updated_at = ? WHERE id = ? AND archived_at IS NULL")
    .run(input.name, input.description, input.model, new Date().toISOString(), id);
  return result.changes ? getAgent(id, db) : null;
}

export function archiveAgent(id: string, db = getDatabase()) {
  return db.transaction(() => {
    db.prepare("DELETE FROM chat_agents WHERE agent_id = ?").run(id);
    return db
      .prepare("UPDATE agents SET archived_at = ?, updated_at = ? WHERE id = ? AND archived_at IS NULL")
      .run(new Date().toISOString(), new Date().toISOString(), id).changes > 0;
  })();
}

export function listChats(db = getDatabase()): ChatSummary[] {
  const rows = db
    .prepare(
      `SELECT c.*, COUNT(m.id) AS message_count
       FROM chats c LEFT JOIN messages m ON m.chat_id = c.id
       GROUP BY c.id ORDER BY c.updated_at DESC`,
    )
    .all() as ChatRow[];
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messageCount: Number(row.message_count),
  }));
}

export function createChat(title: string, db = getDatabase()): ChatSummary {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare("INSERT INTO chats (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, title, now, now);
  return { id, title, createdAt: now, updatedAt: now, messageCount: 0 };
}

export function updateChat(id: string, title: string, db = getDatabase()) {
  return db.prepare("UPDATE chats SET title = ?, updated_at = ? WHERE id = ?").run(title, new Date().toISOString(), id)
    .changes > 0;
}

export function deleteChat(id: string, db = getDatabase()) {
  return db.prepare("DELETE FROM chats WHERE id = ?").run(id).changes > 0;
}

function roomAgents(chatId: string, db: Database.Database): RoomAgent[] {
  const rows = db
    .prepare(
      `SELECT a.*, ca.position, ca.joined_at FROM chat_agents ca
       JOIN agents a ON a.id = ca.agent_id
       WHERE ca.chat_id = ? ORDER BY ca.position`,
    )
    .all(chatId) as RoomAgentRow[];
  return rows.map((row) => ({ ...mapAgent(row), position: row.position, joinedAt: row.joined_at }));
}

export function getChatDetail(id: string, db = getDatabase()): ChatDetail | null {
  const summary = listChats(db).find((chat) => chat.id === id);
  if (!summary) return null;

  const messages = (
    db.prepare("SELECT * FROM messages WHERE chat_id = ? ORDER BY sequence").all(id) as MessageRow[]
  ).map(mapMessage);
  const turnRows = db.prepare("SELECT * FROM turns WHERE chat_id = ? ORDER BY created_at").all(id) as TurnRow[];
  const turns = turnRows.map((turn) => {
    const evaluations = (
      db.prepare("SELECT * FROM agent_evaluations WHERE turn_id = ? ORDER BY position").all(turn.id) as EvaluationRow[]
    ).map(mapEvaluation);
    return mapTurn(turn, evaluations);
  });
  return { ...summary, roomAgents: roomAgents(id, db), messages, turns };
}

export function replaceRoomAgents(chatId: string, agentIds: string[], db = getDatabase()) {
  return db.transaction(() => {
    const chat = db.prepare("SELECT id FROM chats WHERE id = ?").get(chatId);
    if (!chat) return { ok: false as const, reason: "chat_not_found" as const };
    if (agentIds.length) {
      const placeholders = agentIds.map(() => "?").join(",");
      const rows = db
        .prepare(`SELECT id FROM agents WHERE archived_at IS NULL AND id IN (${placeholders})`)
        .all(...agentIds) as { id: string }[];
      if (rows.length !== agentIds.length) return { ok: false as const, reason: "agent_not_found" as const };
    }
    db.prepare("DELETE FROM chat_agents WHERE chat_id = ?").run(chatId);
    const insert = db.prepare(
      "INSERT INTO chat_agents (chat_id, agent_id, position, joined_at) VALUES (?, ?, ?, ?)",
    );
    const now = new Date().toISOString();
    agentIds.forEach((agentId, position) => insert.run(chatId, agentId, position, now));
    db.prepare("UPDATE chats SET updated_at = ? WHERE id = ?").run(now, chatId);
    return { ok: true as const, agents: roomAgents(chatId, db) };
  })();
}

export type PreparedTurn = {
  turn: ChatTurn;
  userMessage: ChatMessage;
  agents: AgentSnapshot[];
  priorMessages: PriorMessage[];
  reused: boolean;
};

export class ChatBusyError extends Error {
  constructor() {
    super("Another turn is already running in this room.");
    this.name = "ChatBusyError";
  }
}

export function beginTurn(
  chatId: string,
  content: string,
  clientTurnId: string,
  db = getDatabase(),
): PreparedTurn | null {
  return db.transaction(() => {
    const chat = db.prepare("SELECT id FROM chats WHERE id = ?").get(chatId);
    if (!chat) return null;

    const existing = db
      .prepare("SELECT * FROM turns WHERE chat_id = ? AND client_turn_id = ?")
      .get(chatId, clientTurnId) as TurnRow | undefined;
    if (existing) {
      const user = db
        .prepare("SELECT * FROM messages WHERE turn_id = ? AND role = 'user'")
        .get(existing.id) as MessageRow;
      return { turn: mapTurn(existing), userMessage: mapMessage(user), agents: [], priorMessages: [], reused: true };
    }

    const staleBefore = new Date(Date.now() - 10 * 60_000).toISOString();
    db.prepare(
      "UPDATE turns SET status = 'failed', completed_at = ? WHERE chat_id = ? AND status = 'running' AND created_at < ?",
    ).run(new Date().toISOString(), chatId, staleBefore);
    const active = db.prepare("SELECT id FROM turns WHERE chat_id = ? AND status = 'running'").get(chatId);
    if (active) throw new ChatBusyError();

    const sequenceRow = db
      .prepare("SELECT COALESCE(MAX(sequence), 0) + 1 AS next_sequence FROM messages WHERE chat_id = ?")
      .get(chatId) as { next_sequence: number };
    const turnId = randomUUID();
    const messageId = randomUUID();
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO turns (id, chat_id, client_turn_id, status, created_at) VALUES (?, ?, ?, 'running', ?)",
    ).run(turnId, chatId, clientTurnId, now);
    db.prepare(
      `INSERT INTO messages (id, chat_id, turn_id, role, content, sequence, created_at)
       VALUES (?, ?, ?, 'user', ?, ?, ?)`,
    ).run(messageId, chatId, turnId, content, sequenceRow.next_sequence, now);
    db.prepare("UPDATE chats SET updated_at = ? WHERE id = ?").run(now, chatId);

    const snapshot = db
      .prepare(
        `SELECT a.id, a.name, a.description, a.model, ca.position
         FROM chat_agents ca JOIN agents a ON a.id = ca.agent_id
         WHERE ca.chat_id = ? ORDER BY ca.position`,
      )
      .all(chatId) as AgentSnapshot[];
    const priorRows = db
      .prepare("SELECT role, content, agent_name FROM messages WHERE chat_id = ? AND sequence < ? ORDER BY sequence")
      .all(chatId, sequenceRow.next_sequence) as { role: "user" | "agent"; content: string; agent_name: string | null }[];
    const priorMessages: PriorMessage[] = priorRows.map((row) => ({
      role: row.role === "user" ? "user" : "assistant",
      content: row.role === "agent" ? `[${row.agent_name ?? "Agent"}]\n${row.content}` : row.content,
    }));
    const turn: ChatTurn = {
      id: turnId,
      chatId,
      clientTurnId,
      status: "running",
      createdAt: now,
      completedAt: null,
      evaluations: [],
    };
    const userMessage: ChatMessage = {
      id: messageId,
      chatId,
      turnId,
      role: "user",
      content,
      agentId: null,
      agentName: null,
      sequence: sequenceRow.next_sequence,
      createdAt: now,
    };
    return { turn, userMessage, agents: snapshot, priorMessages, reused: false };
  })();
}

export function startEvaluation(turnId: string, agent: AgentSnapshot, db = getDatabase()) {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO agent_evaluations
      (id, turn_id, agent_id, agent_name, position, model_snapshot, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'running', ?)`,
  ).run(id, turnId, agent.id, agent.name, agent.position, agent.model, new Date().toISOString());
  return id;
}

export function finishEvaluation(
  id: string,
  result: { status: Exclude<EvaluationStatus, "running">; content?: string | null; errorCode?: string | null; durationMs: number },
  db = getDatabase(),
) {
  db.prepare(
    "UPDATE agent_evaluations SET status = ?, content = ?, error_code = ?, duration_ms = ? WHERE id = ?",
  ).run(result.status, result.content ?? null, result.errorCode ?? null, result.durationMs, id);
}

export function addAgentMessage(
  prepared: PreparedTurn,
  agent: AgentSnapshot,
  content: string,
  db = getDatabase(),
) {
  const next = db
    .prepare("SELECT COALESCE(MAX(sequence), 0) + 1 AS value FROM messages WHERE chat_id = ?")
    .get(prepared.turn.chatId) as { value: number };
  db.prepare(
    `INSERT INTO messages (id, chat_id, turn_id, role, content, agent_id, agent_name, sequence, created_at)
     VALUES (?, ?, ?, 'agent', ?, ?, ?, ?, ?)`,
  ).run(
    randomUUID(),
    prepared.turn.chatId,
    prepared.turn.id,
    content,
    agent.id,
    agent.name,
    next.value,
    new Date().toISOString(),
  );
}

export function completeTurn(turnId: string, status: ChatTurn["status"], db = getDatabase()) {
  db.prepare("UPDATE turns SET status = ?, completed_at = ? WHERE id = ?").run(status, new Date().toISOString(), turnId);
}
