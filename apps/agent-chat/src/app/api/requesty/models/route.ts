import { listRequestyModels, ProviderError } from "@/lib/server/gateway";
import { errorResponse, HttpError, requestyKey } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const apiKey = requestyKey(request);
    if (!apiKey) throw new HttpError(401, "requesty_key_required", "Enter your Requesty API key first.");
    return Response.json({ models: await listRequestyModels(apiKey) });
  } catch (error) {
    if (error instanceof ProviderError) {
      return Response.json({ error: error.code, message: error.message }, { status: error.code === "invalid_key" ? 401 : 502 });
    }
    return errorResponse(error);
  }
}
