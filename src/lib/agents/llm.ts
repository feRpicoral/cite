import Anthropic from "@anthropic-ai/sdk";
import { toJSONSchema, type z, type ZodType } from "zod";

import { requireEnv } from "@/lib/env";

let _client: Anthropic | null = null;
function client(): Anthropic {
  _client ??= new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });
  return _client;
}

export const HAIKU_MODEL = "claude-haiku-4-5-20251001";
export const SONNET_MODEL = "claude-sonnet-4-6";

/**
 * The system prompt is sent with `cache_control: ephemeral` so re-runs within
 * the prompt cache window skip re-tokenizing it.
 */
export async function structuredCall<S extends ZodType>(opts: {
  model: string;
  system: string;
  user: string;
  schema: S;
  toolName: string;
  toolDescription: string;
  maxTokens?: number;
}): Promise<z.infer<S>> {
  const inputSchema = toJSONSchema(opts.schema, { target: "draft-7" });
  const response = await client().messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens ?? 1024,
    system: [
      {
        type: "text",
        text: opts.system,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [
      {
        name: opts.toolName,
        description: opts.toolDescription,
        input_schema: inputSchema as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: opts.toolName },
    messages: [{ role: "user", content: opts.user }],
  });

  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUse) {
    throw new Error("LLM did not return a tool_use block");
  }
  return opts.schema.parse(toolUse.input);
}
