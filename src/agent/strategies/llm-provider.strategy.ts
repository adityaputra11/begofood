import { BaseLlm } from '@google/adk';

export abstract class LlmProviderStrategy {
  abstract readonly provider: string;
  abstract getModel(): string | BaseLlm;
}
