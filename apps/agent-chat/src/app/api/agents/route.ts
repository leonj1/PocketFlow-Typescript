import { createAgent, getAgents } from "@/lib/server/repository";
import { agentInputSchema } from "@/lib/validation";
import { errorResponse, readJson } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ agents: getAgents() });
}

export async function POST(request: Request) {
  try {
    const input = agentInputSchema.parse(await readJson(request));
    return Response.json({ agent: createAgent(input) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
