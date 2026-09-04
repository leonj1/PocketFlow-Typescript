import { archiveAgent, updateAgent } from "@/lib/server/repository";
import { agentInputSchema } from "@/lib/validation";
import { errorResponse, HttpError, readJson } from "@/lib/server/http";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const input = agentInputSchema.parse(await readJson(request));
    const agent = updateAgent(id, input);
    if (!agent) throw new HttpError(404, "agent_not_found", "That agent no longer exists.");
    return Response.json({ agent });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    if (!archiveAgent(id)) throw new HttpError(404, "agent_not_found", "That agent no longer exists.");
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
