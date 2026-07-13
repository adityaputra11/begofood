import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service.js';
import { KnowledgeAgentService } from '../services/knowledge-agent.service.js';
import { AnalysisEventService } from '../services/analysis-event.service.js';

export const MENU_ANALYSIS_QUEUE = 'menu-analysis';

export interface MenuAnalysisJob {
  menuId: string;
  name: string;
  description?: string;
  sourceUrl?: string;
}

@Processor(MENU_ANALYSIS_QUEUE)
export class MenuAnalysisProcessor {
  private readonly logger = new Logger(MenuAnalysisProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly knowledge: KnowledgeAgentService,
    private readonly events: AnalysisEventService,
  ) {}

  @Process('analyze')
  async handleAnalyze(job: Job) {
    const { menuId, name, description, sourceUrl } = job.data;
    this.logger.log(`Processing job #${job.id}: "${name}"`);

    try {
      const analysis = await this.knowledge.analyze(
        name,
        description,
        sourceUrl,
      );

      // Hanya update kalo dapet hasil yang berarti
      const hasData =
        analysis.ingredients.length > 0 ||
        analysis.allergens.length > 0 ||
        analysis.sensoryProfile.length > 0 ||
        analysis.tags.length > 0 ||
        analysis.estimatedCalories !== null;

      if (!hasData) {
        this.logger.warn(`⚠️  Analysis "${name}" kosong, skip update DB`);
        return;
      }

      const updateData: Record<string, unknown> = {
        ingredients: analysis.ingredients,
        allergens: analysis.allergens,
        sensoryProfile: analysis.sensoryProfile,
        tags: analysis.tags,
        calories: analysis.estimatedCalories,
      };
      if (analysis.description) {
        updateData.aiDescription = analysis.description;
      }
      if (analysis.estimatedPrice) {
        updateData.price = analysis.estimatedPrice;
      }
      await this.prisma.menu.update({
        where: { id: menuId },
        data: updateData,
      });

      this.logger.log(
        `✅ Menu "${name}" updated: ${analysis.ingredients.length} ingredients, ${analysis.allergens.length} allergens, ${analysis.tags.length} tags`,
      );
      this.events.emit({
        type: 'completed',
        menuId,
        menuName: name,
        timestamp: new Date().toISOString(),
        message: `Analysis complete: ${analysis.ingredients.length} ingredients, ${analysis.allergens.length} allergens, ${analysis.tags.length} tags`,
      });
    } catch (error) {
      this.logger.error(
        `❌ Gagal menganalisis "${name}" (job #${job.id}): ${(error as Error).message}`,
      );
      this.events.emit({
        type: 'failed',
        menuId,
        menuName: name,
        timestamp: new Date().toISOString(),
        message: (error as Error).message,
      });
      // Jangan throw biar gak di-retry (model error bukan temporary)
    }
  }
}
