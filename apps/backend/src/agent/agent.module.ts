import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller.js';
import { AgentService } from './agent.service.js';
import {
  MenuAnalysisProcessor,
  MENU_ANALYSIS_QUEUE,
} from './queues/menu-analysis.processor.js';
import { KnowledgeAgentService } from './services/knowledge-agent.service.js';
import { AnalysisEventService } from './services/analysis-event.service.js';

function redisConfig() {
  const url = process.env.REDIS_URL;
  if (url) {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: Number(parsed.port) || 6379,
      password: parsed.password
        ? decodeURIComponent(parsed.password)
        : undefined,
      tls: parsed.hostname !== 'localhost' ? {} : undefined,
    };
  }

  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    ...(process.env.REDIS_PASSWORD
      ? { password: process.env.REDIS_PASSWORD }
      : {}),
  };
}

@Module({
  imports: [
    BullModule.forRoot({
      redis: redisConfig(),
      defaultJobOptions: {
        attempts: 1,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
      limiter: {
        max: 1,
        duration: 8000,
      },
    }),
    BullModule.registerQueue({ name: MENU_ANALYSIS_QUEUE }),
  ],
  controllers: [AgentController],
  providers: [
    AgentService,
    KnowledgeAgentService,
    MenuAnalysisProcessor,
    AnalysisEventService,
  ],
  exports: [AgentService, KnowledgeAgentService, AnalysisEventService],
})
export class AgentModule {}
