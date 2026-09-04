import { getDatabase } from "@/lib/server/db";
import { errorResponse, HttpError, readJson, requestyKey } from "@/lib/server/http";
import { RequestyGateway } from "@/lib/server/gateway";
import { executePreparedTurn, type TurnEvent } from "@/lib/server/orchestration";
import { beginTurn, ChatBusyError, getChatDetail } from "@/lib/server/repository";
import { turnInputSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 300;

type Context = { params: Promise<{ chatId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { chatId } = await context.params;
    const input = turnInputSchema.parse(await readJson(request));
    const current = getChatDetail(chatId);
    if (!current) throw new HttpError(404, "chat_not_found", "That room no longer exists.");
    const apiKey = requestyKey(request);
    if (current.roomAgents.length > 0 && !apiKey) {
      throw new HttpError(401, "requesty_key_required", "Enter your Requesty API key in the header before sending.");
    }
    const db = getDatabase();
    const prepared = beginTurn(chatId, input.content, input.clientTurnId, db);
    if (!prepared) throw new HttpError(404, "chat_not_found", "That room no longer exists.");
    if (prepared.reused) return Response.json({ chat: getChatDetail(chatId, db), reused: true });

    const acceptsStream = request.headers.get("accept")?.includes("application/x-ndjson");
    if (!acceptsStream) {
      const chat = await executePreparedTurn({ prepared, apiKey, gateway: new RequestyGateway(), db });
      return Response.json({ chat });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (event: TurnEvent | { type: "turn.started" } | { type: "turn.snapshot"; chat: unknown }) => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        };
        void (async () => {
          try {
            send({ type: "turn.started" });
            const chat = await executePreparedTurn({
              prepared,
              apiKey,
              gateway: new RequestyGateway(),
              db,
              onEvent: send,
            });
            send({ type: "turn.snapshot", chat });
          } catch {
            send({ type: "turn.completed", status: "failed" });
          } finally {
            controller.close();
          }
        })();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof ChatBusyError) {
      return Response.json({ error: "chat_busy", message: error.message }, { status: 409 });
    }
    return errorResponse(error);
  }
}
