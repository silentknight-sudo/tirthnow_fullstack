/** Provider-neutral chat completion with tool use (Claude Messages API today). */

export type LlmTier = 'default' | 'cheap';

export interface LlmToolCall {
  id: string;
  name: string;
  input: unknown;
}

export interface LlmToolResult {
  toolCallId: string;
  content: string;
  isError?: boolean;
}

/**
 * Conversation turns. Assistant turns produced by the provider are passed back verbatim via
 * `raw` (thinking and tool-use blocks must be replayed unchanged); history from the database
 * is plain text.
 */
export type LlmMessage =
  | { role: 'user'; text: string }
  | { role: 'user'; toolResults: LlmToolResult[] }
  | { role: 'assistant'; text: string }
  | { role: 'assistant'; raw: unknown };

export interface LlmTool {
  name: string;
  description: string;
  /** JSON Schema (object). */
  inputSchema: Record<string, unknown>;
}

export interface LlmRequest {
  tier: LlmTier;
  system: string;
  messages: LlmMessage[];
  tools?: LlmTool[];
  /** Constrain the final answer to this JSON Schema. */
  jsonSchema?: Record<string, unknown>;
  maxTokens?: number;
  /** Depth vs. cost; defaults per tier. */
  effort?: 'low' | 'medium' | 'high';
}

export type LlmStopReason = 'end' | 'tool_use' | 'max_tokens' | 'refusal';

export interface LlmResult {
  text: string;
  toolCalls: LlmToolCall[];
  stopReason: LlmStopReason;
  /** Opaque provider content to append as the next assistant turn (tool loops). */
  raw: unknown;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

export interface LlmProvider {
  readonly name: string;
  modelFor(tier: LlmTier): string;
  complete(req: LlmRequest): Promise<LlmResult>;
  /** Same as complete, calling `onText` with each visible text delta. */
  stream(req: LlmRequest, onText: (delta: string) => void): Promise<LlmResult>;
}

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
