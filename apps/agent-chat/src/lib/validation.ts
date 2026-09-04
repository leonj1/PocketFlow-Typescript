import { z } from "zod";
import { CHAT_MESSAGE_MAX_CHARACTERS } from "@/lib/limits";

export const modelPattern = /^[a-z0-9][a-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._:-]*$/;

export const agentInputSchema = z.object({
  name: z.string().trim().min(1, "Enter an agent name.").max(80, "Keep the name under 80 characters."),
  description: z
    .string()
    .trim()
    .min(1, "Describe what this agent should contribute.")
    .max(8_000, "Keep the system prompt under 8,000 characters."),
  model: z
    .string()
    .trim()
    .regex(modelPattern, "Use a Requesty model ID such as openai/gpt-4o-mini."),
});

export const chatInputSchema = z.object({
  title: z.string().trim().min(1, "Enter a room name.").max(120, "Keep the room name under 120 characters."),
});

export const membershipSchema = z.object({
  agentIds: z.array(z.string().uuid()).max(8, "A room can contain at most 8 agents.").refine(
    (ids) => new Set(ids).size === ids.length,
    "An agent can only appear once in a room.",
  ),
});

export const turnInputSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Write a message before sending.")
    .max(CHAT_MESSAGE_MAX_CHARACTERS, "Keep messages under 50,000 characters."),
  clientTurnId: z.string().uuid(),
});

export function validationError(error: z.ZodError) {
  return {
    error: "validation_error",
    message: error.issues[0]?.message ?? "Check the submitted fields.",
    fields: error.flatten().fieldErrors,
  };
}
