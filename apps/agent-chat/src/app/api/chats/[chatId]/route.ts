import { deleteChat, getChatDetail, updateChat } from "@/lib/server/repository";
import { chatInputSchema } from "@/lib/validation";
import { errorResponse, HttpError, readJson } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ chatId: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { chatId } = await context.params;
    const chat = getChatDetail(chatId);
    if (!chat) throw new HttpError(404, "chat_not_found", "That room no longer exists.");
    return Response.json({ chat });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { chatId } = await context.params;
    const { title } = chatInputSchema.parse(await readJson(request));
    if (!updateChat(chatId, title)) throw new HttpError(404, "chat_not_found", "That room no longer exists.");
    return Response.json({ chat: getChatDetail(chatId) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { chatId } = await context.params;
    if (!deleteChat(chatId)) throw new HttpError(404, "chat_not_found", "That room no longer exists.");
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
