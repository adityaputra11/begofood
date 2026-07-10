import { Injectable } from '@nestjs/common';
import { LlmProviderStrategy } from './llm-provider.strategy.js';

@Injectable()
export class GeminiProviderStrategy extends LlmProviderStrategy {
  readonly provider = 'gemini';

  getModel(): string {
    return 'gemini-2.0-flash';
  }
}
