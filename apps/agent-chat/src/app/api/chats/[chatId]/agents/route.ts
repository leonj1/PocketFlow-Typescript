import { replaceRoomAgents } from "@/lib/server/repository";
import { membershipSchema } from "@/lib/validation";
import { errorResponse, HttpError, readJson } from "@/lib/server/http";

export const runtime = "nodejs";

type Context = { params: Promise<{ chatId: string }> };

export async function PUT(request: Request, context: Context) {
  try {
    const { chatId } = await context.params;
    const { agentIds } = membershipSchema.parse(await readJson(request));
    const result = replaceRoomAgents(chatId, agentIds);
    if (!result.ok) {
      const message = result.reason === "chat_not_found" ? "That room no longer exists." : "One of those agents is unavailable.";
      throw new HttpError(404, result.reason, message);
    }
    return Response.json({ agents: result.agents });
  } catch (error) {
    return errorResponse(error);
  }
}
