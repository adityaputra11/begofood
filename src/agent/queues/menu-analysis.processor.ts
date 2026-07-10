import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service.js';
import { KnowledgeAgentService } from '../services/knowledge-agent.service.js';

export const MENU_ANALYSIS_QUEUE = 'menu-analysis';

export interface MenuAnalysisJob {
  menuId: string;
  name: string;
  description?: string;
}

@Processor(MENU_ANALYSIS_QUEUE)
export class MenuAnalysisProcessor {
  private readonly logger = new Logger(MenuAnalysisProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly knowledge: KnowledgeAgentService,
  ) {}

  @Process('analyze')
  async handleAnalyze(job: Job) {
    const { menuId, name, description } = job.data;
    this.logger.log(`Processing job #${job.id}: "${name}"`);

    try {
      const analysis = await this.knowledge.analyze(name, description);

      // Hanya update kalo dapet hasil yang berarti
      const hasData =
        analysis.ingredients.length > 0 ||
        analysis.allergens.length > 0 ||
        analysis.tags.length > 0 ||
        analysis.estimatedCalories !== null;

      if (!hasData) {
        this.logger.warn(`⚠️  Analysis "${name}" kosong, skip update DB`);
        return;
      }

      await this.prisma.menu.update({
        where: { id: menuId },
        data: {
          ingredients: analysis.ingredients,
          allergens: analysis.allergens,
          tags: analysis.tags,
          calories: analysis.estimatedCalories,
        },
      });

      this.logger.log(
        `✅ Menu "${name}" updated: ${analysis.ingredients.length} ingredients, ${analysis.allergens.length} allergens, ${analysis.tags.length} tags`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Gagal menganalisis "${name}" (job #${job.id}): ${(error as Error).message}`,
      );
      // Jangan throw biar gak di-retry (model error bukan temporary)
    }
  }
}
