import type { Metadata } from "next";
import { AgentManager } from "@/components/agent-manager";
import { getAgents } from "@/lib/server/repository";

export const metadata: Metadata = { title: "Agents" };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function AgentsPage() {
  return <AgentManager initialAgents={getAgents()} />;
}
