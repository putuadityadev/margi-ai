import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { AppConfig } from '../config/app-config.service';
import { AppException } from '../common/app.exception';
import { httpJson } from '../common/http-json';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const CHAT_TIMEOUT_MS = 15_000;
const EMBED_TIMEOUT_MS = 10_000;

/**
 * Raised when the LLM cannot answer. It is a 503 `SERVICE_UNAVAILABLE`: the product shows an
 * error state instead of substituting canned text (owner decision, D-029).
 */
export class LlmUnavailableError extends AppException {
  constructor(message: string) {
    super('SERVICE_UNAVAILABLE', message, HttpStatus.SERVICE_UNAVAILABLE);
  }
}

export interface ChatToolSpec {
  readonly name: string;
  readonly description: string;
  /** JSON Schema of the tool arguments, generated from the shared Zod schema. */
  readonly parameters: Readonly<Record<string, unknown>>;
}

export type ChatMessage =
  | { readonly role: 'system' | 'user'; readonly content: string }
  | {
      readonly role: 'assistant';
      readonly content: string | null;
      readonly tool_calls?: readonly ToolCall[];
    }
  | { readonly role: 'tool'; readonly tool_call_id: string; readonly content: string };

const ToolCallSchema = z.object({
  id: z.string(),
  type: z.literal('function'),
  function: z.object({ name: z.string(), arguments: z.string() }),
});
export type ToolCall = z.infer<typeof ToolCallSchema>;

const ChatResponseSchema = z.object({
  model: z.string().optional(),
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().nullable().optional(),
          tool_calls: z.array(ToolCallSchema).optional(),
        }),
      }),
    )
    .min(1),
});

const EmbeddingResponseSchema = z.object({
  data: z.array(z.object({ index: z.number(), embedding: z.array(z.number()) })).min(1),
});

export interface ChatRequest {
  readonly messages: readonly ChatMessage[];
  readonly tools?: readonly ChatToolSpec[];
  readonly maxTokens: number;
  /** Model chain override; defaults to the agent model plus its fallbacks. */
  readonly models?: readonly string[];
  readonly json?: boolean;
}

export interface ChatResult {
  readonly content: string | null;
  readonly toolCalls: readonly ToolCall[];
  readonly model: string;
}

/**
 * Thin OpenRouter client (TDD §6.2): bounded timeouts, provider-side model fallback through
 * `models[]`, and typed parsing of every response. No prompt text or user input is logged.
 */
@Injectable()
export class OpenRouterClient {
  private readonly logger = new Logger(OpenRouterClient.name);

  constructor(private readonly config: AppConfig) {}

  get embeddingModel(): string {
    return this.config.ai.embeddingModel;
  }

  get isConfigured(): boolean {
    return Boolean(this.config.ai.openRouterApiKey) && !this.config.ai.mock;
  }

  async chat(request: ChatRequest): Promise<ChatResult> {
    const { agentModel, fallbackModels } = this.config.ai;
    const chain = request.models ?? [agentModel, ...fallbackModels];
    const [primary, ...rest] = chain;
    if (!primary) throw new LlmUnavailableError('No model configured');

    const body = {
      model: primary,
      ...(rest.length > 0 ? { models: [primary, ...rest] } : {}),
      messages: request.messages,
      max_tokens: request.maxTokens,
      temperature: 0.2,
      ...(request.tools && request.tools.length > 0
        ? {
            tools: request.tools.map((tool) => ({ type: 'function', function: tool })),
            tool_choice: 'auto',
          }
        : {}),
      ...(request.json ? { response_format: { type: 'json_object' } } : {}),
    };

    const raw = await this.post('/chat/completions', body, CHAT_TIMEOUT_MS);
    const parsed = ChatResponseSchema.safeParse(raw);
    const message = parsed.success ? parsed.data.choices[0]?.message : undefined;
    if (!parsed.success || !message) throw new LlmUnavailableError('Unexpected chat response');
    return {
      content: message.content ?? null,
      toolCalls: message.tool_calls ?? [],
      model: parsed.data.model ?? primary,
    };
  }

  /** Embeds `inputs` with the configured model at the configured dimensionality. */
  async embed(inputs: readonly string[]): Promise<number[][]> {
    const { embeddingModel, embeddingDimensions } = this.config.ai;
    const raw = await this.post(
      '/embeddings',
      { model: embeddingModel, input: inputs, dimensions: embeddingDimensions },
      EMBED_TIMEOUT_MS,
    );
    const parsed = EmbeddingResponseSchema.safeParse(raw);
    if (!parsed.success) throw new LlmUnavailableError('Unexpected embedding response');
    const ordered = [...parsed.data.data].sort((a, b) => a.index - b.index);
    return ordered.map((row) => row.embedding);
  }

  private async post(path: string, body: unknown, timeoutMs: number): Promise<unknown> {
    const key = this.config.ai.openRouterApiKey;
    if (!key || this.config.ai.mock) throw new LlmUnavailableError('LLM is not configured');
    try {
      return await httpJson(`${OPENROUTER_BASE}${path}`, {
        method: 'POST',
        body,
        timeoutMs,
        headers: {
          authorization: `Bearer ${key}`,
          'http-referer': this.config.appUrl,
          'x-title': 'MARGI AI',
        },
      });
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : 'unknown';
      this.logger.warn({ path, detail }, 'OpenRouter call failed');
      throw new LlmUnavailableError(detail);
    }
  }
}
