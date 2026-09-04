import { ZodError } from "zod";
import { validationError } from "@/lib/validation";

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "invalid_json", "Send a valid JSON request body.");
  }
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof ZodError) return Response.json(validationError(error), { status: 422 });
  if (error instanceof HttpError) {
    return Response.json({ error: error.code, message: error.message }, { status: error.status });
  }
  return Response.json({ error: "internal_error", message: "Something went wrong. Try again." }, { status: 500 });
}

export function requestyKey(request: Request) {
  return request.headers.get("x-requesty-key")?.trim() ?? "";
}
