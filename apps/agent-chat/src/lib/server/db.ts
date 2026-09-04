import "server-only";

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

declare global {
  var __pocketflowRoomsDb: Database.Database | undefined;
}

function initialize(db: Database.Database) {
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      model TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT
    );

    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_agents (
      chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
      position INTEGER NOT NULL,
      joined_at TEXT NOT NULL,
      PRIMARY KEY (chat_id, agent_id),
      UNIQUE (chat_id, position)
    );

    CREATE TABLE IF NOT EXISTS turns (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      client_turn_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'partial', 'failed')),
      created_at TEXT NOT NULL,
      completed_at TEXT,
      UNIQUE (chat_id, client_turn_id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS one_running_turn_per_chat
      ON turns(chat_id) WHERE status = 'running';

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      turn_id TEXT NOT NULL REFERENCES turns(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user', 'agent')),
      content TEXT NOT NULL,
      agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
      agent_name TEXT,
      sequence INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (chat_id, sequence)
    );

    CREATE TABLE IF NOT EXISTS agent_evaluations (
      id TEXT PRIMARY KEY,
      turn_id TEXT NOT NULL REFERENCES turns(id) ON DELETE CASCADE,
      agent_id TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      position INTEGER NOT NULL,
      model_snapshot TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('running', 'responded', 'abstained', 'failed')),
      content TEXT,
      error_code TEXT,
      duration_ms INTEGER,
      created_at TEXT NOT NULL,
      UNIQUE (turn_id, position)
    );

    CREATE INDEX IF NOT EXISTS messages_chat_sequence ON messages(chat_id, sequence);
    CREATE INDEX IF NOT EXISTS chat_agents_order ON chat_agents(chat_id, position);
    CREATE INDEX IF NOT EXISTS evaluations_turn_order ON agent_evaluations(turn_id, position);
  `);
}

export function createDatabase(filename: string) {
  if (filename !== ":memory:") mkdirSync(dirname(filename), { recursive: true });
  const db = new Database(filename);
  initialize(db);
  return db;
}

export function getDatabase() {
  if (global.__pocketflowRoomsDb) return global.__pocketflowRoomsDb;
  const configured = process.env.DATABASE_PATH ?? ".data/agent-chat.db";
  const db = createDatabase(configured);
  if (process.env.NODE_ENV !== "production") global.__pocketflowRoomsDb = db;
  return db;
}
