import { Injectable } from '@nestjs/common';
import { LlmProviderStrategy } from './llm-provider.strategy.js';
import { NebiusLlm } from '../models/nebius.llm.js';

const DEFAULT_MODEL = 'deepseek-ai/DeepSeek-V4-Pro';

@Injectable()
export class NebiusProviderStrategy extends LlmProviderStrategy {
  readonly provider = 'nebius';

  getModel(): NebiusLlm {
    const modelName = process.env.AGENT_MODEL || DEFAULT_MODEL;
    return new NebiusLlm({ model: modelName });
  }
}
