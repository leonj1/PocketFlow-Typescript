import { createChat, listChats } from "@/lib/server/repository";
import { chatInputSchema } from "@/lib/validation";
import { errorResponse, readJson } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ chats: listChats() });
}

export async function POST(request: Request) {
  try {
    const input = chatInputSchema.parse(await readJson(request));
    return Response.json({ chat: createChat(input.title) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
