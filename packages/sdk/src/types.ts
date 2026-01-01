import { z } from 'zod';

export const NeoChatRoleSchema = z.enum(['system', 'user', 'assistant', 'tool']);
export type NeoChatRole = z.infer<typeof NeoChatRoleSchema>;

export const NeoChatMessageSchema = z
  .object({
    role: NeoChatRoleSchema,
    content: z.string().nullable().optional(),
    name: z.string().optional(),
    tool_call_id: z.string().optional(),
    tool_calls: z
      .array(
        z.object({
          id: z.string(),
          type: z.literal('function'),
          function: z.object({
            name: z.string(),
            arguments: z.string()
          })
        })
      )
      .optional()
  })
  .strict();

export type NeoChatMessage = z.infer<typeof NeoChatMessageSchema>;

export type NeoToolSchema = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type NeoToolChoice =
  | 'auto'
  | 'none'
  | {
      type: 'function';
      function: { name: string };
    };

export const NeoChatCompletionRequestSchema = z
  .object({
    model: z.string().optional(),
    messages: z.array(NeoChatMessageSchema),
    tools: z.array(z.any()).optional(),
    tool_choice: z.any().optional(),
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().int().positive().optional(),
    stream: z.boolean().optional()
  })
  .strict();

export type NeoChatCompletionRequest = z.infer<typeof NeoChatCompletionRequestSchema>;

export type NeoChatCompletionResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: NeoChatMessage;
    finish_reason: string | null;
  }>;
  usage?: Record<string, unknown>;
};

// Response validation is more permissive to stay forward-compatible.
export const NeoChatMessageResponseSchema = NeoChatMessageSchema.passthrough();

export const NeoChatCompletionResponseSchema = z
  .object({
    id: z.string(),
    object: z.string(),
    created: z.number(),
    model: z.string(),
    choices: z.array(
      z.object({
        index: z.number(),
        message: NeoChatMessageResponseSchema,
        finish_reason: z.string().nullable()
      })
    ),
    usage: z.record(z.unknown()).optional()
  })
  .passthrough();

export type NeoStreamChunk = {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices?: Array<{
    index: number;
    delta?: {
      role?: NeoChatRole;
      content?: string | null;
      tool_calls?: Array<{
        index?: number;
        id?: string;
        type?: 'function';
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string | null;
  }>;
};

export type NeoToolHandler = (args: unknown, ctx: { signal?: AbortSignal }) => Promise<unknown>;

export type NeoToolRegistry = {
  tools: NeoToolSchema[];
  handlers?: Record<string, NeoToolHandler>;
};

export type NeoriumClientOptions = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  maxRetries?: number;
  userAgent?: string;
  fetch?: typeof fetch;
  maxToolIterations?: number;
};
