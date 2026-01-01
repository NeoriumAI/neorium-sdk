import { z } from 'zod';
import { DEFAULT_NEO_SYSTEM_PROMPT } from '@neorium/prompts';
import {
  NeoChatCompletionRequestSchema,
  NeoChatCompletionResponseSchema,
  type NeoChatCompletionRequest,
  type NeoChatCompletionResponse,
  type NeoChatMessage,
  type NeoStreamChunk,
  type NeoriumClientOptions,
  type NeoToolHandler
} from './types.js';
import { NeoAPIError } from './errors.js';
import {
  readNeoApiKeyFromEnv,
  readNeoBaseUrlFromEnv,
  readNeoModelFromEnv,
  readNeoTimeoutMsFromEnv,
  requireNeoApiKey
} from './env.js';
import { httpJson, mergeSignals, safeReadJson } from './http.js';
import { parseSse } from './sse.js';
import { ToolCallSchema } from './tools/types.js';

const DEFAULT_BASE_URL = 'https://api.neorium.ai';
const DEFAULT_MODEL = 'neorium-1';

export class NeoriumClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly userAgent: string | undefined;
  private readonly fetchImpl: typeof fetch;
  private readonly maxToolIterations: number;

  public readonly chat: {
    completions: {
      create: (request: NeoChatCompletionRequest, opts?: {
        signal?: AbortSignal;
        toolHandlers?: Record<string, NeoToolHandler>;
        maxToolIterations?: number;
      }) => Promise<NeoChatCompletionResponse>;
      stream: (request: NeoChatCompletionRequest, opts?: {
        signal?: AbortSignal;
      }) => AsyncIterable<NeoStreamChunk>;
    };
  };

  constructor(options: NeoriumClientOptions = {}) {
    const apiKey = options.apiKey ?? readNeoApiKeyFromEnv();
    this.apiKey = requireNeoApiKey(apiKey);
    this.baseUrl = options.baseUrl ?? readNeoBaseUrlFromEnv() ?? DEFAULT_BASE_URL;
    this.model = options.model ?? readNeoModelFromEnv() ?? DEFAULT_MODEL;
    this.timeoutMs = options.timeoutMs ?? readNeoTimeoutMsFromEnv() ?? 30_000;
    this.maxRetries = options.maxRetries ?? 2;
    this.userAgent = options.userAgent;
    this.fetchImpl = options.fetch ?? fetch;
    this.maxToolIterations = options.maxToolIterations ?? 5;

    this.chat = {
      completions: {
        create: (request, opts) => this.createChatCompletion(request, opts),
        stream: (request, opts) => this.streamChatCompletion(request, opts)
      }
    };
  }

  private normalizeRequest(request: NeoChatCompletionRequest): NeoChatCompletionRequest {
    const parsed = NeoChatCompletionRequestSchema.parse(request);
    return {
      ...parsed,
      model: parsed.model ?? this.model
    };
  }

  private async createChatCompletion(
    request: NeoChatCompletionRequest,
    opts?: {
      signal?: AbortSignal;
      toolHandlers?: Record<string, NeoToolHandler>;
      maxToolIterations?: number;
    }
  ): Promise<NeoChatCompletionResponse> {
    const normalized = this.normalizeRequest({ ...request, stream: false });

    // Tool loop (safe) if handlers provided and model returns tool calls.
    const toolHandlers = opts?.toolHandlers;
    const maxIters = opts?.maxToolIterations ?? this.maxToolIterations;
    let messages = normalized.messages;
    for (let iter = 0; iter <= maxIters; iter++) {
      const { json } = await httpJson<NeoChatCompletionResponse>(
        {
          baseUrl: this.baseUrl,
          apiKey: this.apiKey,
          userAgent: this.userAgent,
          timeoutMs: this.timeoutMs,
          maxRetries: this.maxRetries,
          fetchImpl: this.fetchImpl
        },
        {
          path: '/v1/chat/completions',
          method: 'POST',
          body: { ...normalized, messages },
          ...(opts?.signal ? { signal: opts.signal } : {})
        }
      );

      const validated = NeoChatCompletionResponseSchema.parse(json) as NeoChatCompletionResponse;

      const choice = validated.choices?.[0];
      const msg = choice?.message;
      if (!msg) return validated;

      const toolCalls = msg.tool_calls;
      if (!toolCalls || toolCalls.length === 0 || !toolHandlers) return validated;

      if (iter === maxIters) {
        throw new NeoAPIError(`Tool loop exceeded max iterations (${maxIters}).`, { status: 400, body: { toolCalls } });
      }

      // Validate + execute tool calls.
      const validatedCalls = toolCalls.map((tc) => ToolCallSchema.parse(tc));
      const toolMessages: NeoChatMessage[] = [];

      for (const call of validatedCalls) {
        const toolName = call.function.name;
        const handler = toolHandlers[toolName];
        if (!handler) {
          throw new NeoAPIError(`Unknown tool: ${toolName}`, { status: 400, body: { toolName } });
        }

        let parsedArgs: unknown;
        try {
          parsedArgs = JSON.parse(call.function.arguments || '{}');
        } catch (e) {
          throw new NeoAPIError(`Invalid tool arguments JSON for tool ${toolName}.`, {
            status: 400,
            body: { toolName, arguments: call.function.arguments },
            cause: e
          });
        }

        const ctx = opts?.signal ? { signal: opts.signal } : {};
        const result = await handler(parsedArgs, ctx);
        toolMessages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result)
        });
      }

      messages = [...messages, msg as NeoChatMessage, ...toolMessages];
    }

    // Unreachable
    throw new Error('Unexpected tool loop exit.');
  }

  private async *streamChatCompletion(
    request: NeoChatCompletionRequest,
    opts?: {
      signal?: AbortSignal;
    }
  ): AsyncIterable<NeoStreamChunk> {
    const normalized = this.normalizeRequest({ ...request, stream: true });
    const url = new URL('/v1/chat/completions', this.baseUrl.replace(/\/+$/, '') + '/');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new DOMException('Timeout', 'TimeoutError')), this.timeoutMs);
    const signal = mergeSignals([opts?.signal, controller.signal]);

    try {
      const resp = await this.fetchImpl(url.toString(), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(normalized),
        ...(signal ? { signal } : {})
      });

      if (!resp.ok || !resp.body) {
        const body = await safeReadJson(resp);
        throw new NeoAPIError(`Streaming request failed with status ${resp.status}.`, { status: resp.status, body });
      }

      for await (const ev of parseSse(resp.body)) {
        if (ev.data === '[DONE]') return;
        const chunk = JSON.parse(ev.data) as NeoStreamChunk;
        yield chunk;
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function defaultSystemMessage(): NeoChatMessage {
  return { role: 'system', content: DEFAULT_NEO_SYSTEM_PROMPT };
}
