import { BaseLlm, LLMRegistry } from '@google/adk';
import type { LlmRequest, LlmResponse } from '@google/adk';
import { Content, FinishReason, Part } from '@google/genai';

const NEBIUS_BASE_URL =
  process.env.NEBIUS_BASE_URL || 'https://api.studio.nebius.ai/v1';

/**
 * Custom ADK LLM untuk Nebius AI (OpenAI-compatible API).
 */
export class NebiusLlm extends BaseLlm {
  static readonly supportedModels: Array<string | RegExp> = [/.*/];

  constructor(params: { model: string }) {
    super({ model: params.model });
  }

  async *generateContentAsync(
    llmRequest: LlmRequest,
    _stream?: boolean,
    _abortSignal?: AbortSignal,
  ): AsyncGenerator<LlmResponse> {
    const apiKey =
      process.env.NEBIUS_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      '';

    const messages = this.buildMessages(llmRequest);
    const si = llmRequest.config?.systemInstruction;
    const systemInstruction =
      typeof si === 'string'
        ? si
        : (si as { parts?: Array<{ text?: string }> } | undefined)?.parts
            ?.map((p) => p.text || '')
            .filter(Boolean)
            .join('\n');

    const body: Record<string, unknown> = {
      model: llmRequest.model || this.model,
      messages: systemInstruction
        ? [{ role: 'system', content: systemInstruction }, ...messages]
        : messages,
      temperature: llmRequest.config?.temperature ?? 0.7,
      max_tokens: llmRequest.config?.maxOutputTokens ?? 4096,
      stream: false,
    };

    // Dukung response_format JSON kalo ADK minta structured output
    if (llmRequest.config?.responseMimeType === 'application/json') {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch(`${NEBIUS_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      yield {
        errorCode: String(response.status),
        errorMessage: `Nebius API error (${response.status}): ${errorText}`,
        content: undefined,
      };
      return;
    }

    const json = (await response.json()) as {
      choices?: Array<{
        finish_reason?: string;
        message?: { content?: string };
      }>;
    };

    const choice = json.choices?.[0];
    const text = choice?.message?.content ?? '';

    const parts: Part[] = [{ text }];

    const content: Content = {
      role: 'model',
      parts,
    };

    yield {
      content,
      finishReason: this.mapFinishReason(choice?.finish_reason),
    };
  }

  async connect(_llmRequest: LlmRequest): Promise<never> {
    throw new Error('Live/streaming not supported for Nebius LLM');
  }

  private buildMessages(llmRequest: LlmRequest): Array<{
    role: string;
    content: string;
  }> {
    const messages: Array<{ role: string; content: string }> = [];

    for (const c of llmRequest.contents) {
      const role = c.role === 'user' ? 'user' : 'assistant';
      const text =
        c.parts
          ?.map((p: Part) => p.text || '')
          .filter(Boolean)
          .join('\n') || '';
      if (text) {
        messages.push({ role, content: text });
      }
    }

    return messages;
  }

  private mapFinishReason(reason?: string): FinishReason {
    switch (reason) {
      case 'stop':
        return FinishReason.STOP;
      case 'length':
        return FinishReason.MAX_TOKENS;
      case 'error':
        return FinishReason.OTHER;
      default:
        return FinishReason.FINISH_REASON_UNSPECIFIED;
    }
  }
}

/**
 * Daftarkan semua model Nebius ke ADK registry.
 */
export function registerNebiusModels(): void {
  LLMRegistry.register(NebiusLlm);
}
