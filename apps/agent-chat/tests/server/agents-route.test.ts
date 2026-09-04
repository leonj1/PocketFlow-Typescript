// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { createDatabase } from "@/lib/server/db";
import { GET, POST } from "@/app/api/agents/route";

describe("agents API", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(":memory:");
    global.__pocketflowRoomsDb = db;
  });

  afterEach(() => {
    delete global.__pocketflowRoomsDb;
    db.close();
  });

  it("creates an agent and returns it in the active-agent list", async () => {
    const input = {
      name: "Evidence checker",
      description: "Check consequential factual claims.",
      model: "openai/gpt-4o-mini",
    };
    const createResponse = await POST(new Request("http://localhost/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));

    expect(createResponse.status).toBe(201);
    const created = await createResponse.json();
    expect(created.agent).toMatchObject(input);
    expect(created.agent.id).toEqual(expect.any(String));

    const listResponse = await GET();
    expect(listResponse.status).toBe(200);
    await expect(listResponse.json()).resolves.toEqual({ agents: [created.agent] });
  });
});
