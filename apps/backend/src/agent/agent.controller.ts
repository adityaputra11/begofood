import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service.js';
import { AgentService } from './agent.service.js';
import { KnowledgeAgentService } from './services/knowledge-agent.service.js';
import { ChatRequestDto } from './dtos/chat-request.dto.js';
import { ChatResponseDto } from './dtos/chat-response.dto.js';
import { CreateMenuDto } from './dtos/create-menu.dto.js';
import { MENU_ANALYSIS_QUEUE } from './queues/menu-analysis.processor.js';

@Controller('agent')
export class AgentController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agentService: AgentService,
    private readonly knowledge: KnowledgeAgentService,
    @InjectQueue(MENU_ANALYSIS_QUEUE)
    private readonly analysisQueue: Queue,
  ) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() dto: ChatRequestDto): Promise<ChatResponseDto> {
    try {
      let sessionId = dto.sessionId;

      if (!sessionId) {
        const session = await this.agentService.createSession(dto.userId);
        sessionId = session.sessionId;
      }

      const response = await this.agentService.chat(
        dto.message,
        sessionId,
        dto.userId,
      );

      return { sessionId, response };
    } catch (error) {
      throw new InternalServerErrorException(
        `Gagal memproses pesan: ${(error as Error).message}`,
      );
    }
  }

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  async createSession(
    @Body('userId') userId?: string,
  ): Promise<{ sessionId: string }> {
    return this.agentService.createSession(userId);
  }

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  async analyze(
    @Body() dto: { name: string; description?: string },
  ): Promise<{ name: string; analysis: unknown }> {
    try {
      const analysis = await this.knowledge.analyze(dto.name, dto.description);
      return { name: dto.name, analysis };
    } catch (error) {
      throw new InternalServerErrorException(
        `Gagal menganalisis menu: ${(error as Error).message}`,
      );
    }
  }

  @Get('preferences')
  @HttpCode(HttpStatus.OK)
  async getPreferences(@Query('userId') userId: string) {
    try {
      return await this.agentService.getUserPreference(userId);
    } catch (error) {
      throw new InternalServerErrorException(
        `Gagal mengambil preferensi: ${(error as Error).message}`,
      );
    }
  }

  @Post('preferences')
  @HttpCode(HttpStatus.OK)
  async savePreferences(
    @Body()
    dto: {
      userId: string;
      allergies?: string[];
      diet?: string;
      dislikedTags?: string[];
    },
  ) {
    try {
      return await this.agentService.saveUserPreference(dto.userId, {
        allergies: dto.allergies,
        diet: dto.diet,
        dislikedTags: dto.dislikedTags,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Gagal menyimpan preferensi: ${(error as Error).message}`,
      );
    }
  }

  @Get('menu')
  @HttpCode(HttpStatus.OK)
  async getMenus(
    @Query('userId') userId: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('cluster') cluster?: string,
    @Query('sensory') sensory?: string,
  ) {
    try {
      const startedAt = performance.now();
      const result = await this.agentService.getFilteredMenu(userId, {
        category,
        search,
        cluster,
        sensory: sensory
          ?.split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      });

      return {
        safe: result.safe,
        unsafe: result.unsafe,
        summary:
          result.unsafe.length > 0
            ? `${result.safe.length} menu aman, ${result.unsafe.length} menu mengandung alergen Anda`
            : `${result.safe.length} menu tersedia`,
        meta: {
          processingMs: Number((performance.now() - startedAt).toFixed(2)),
          evaluatedMenus: result.safe.length + result.unsafe.length,
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Gagal memuat menu: ${(error as Error).message}`,
      );
    }
  }

  @Post('menu')
  @HttpCode(HttpStatus.CREATED)
  async createMenu(
    @Body() dto: CreateMenuDto,
  ): Promise<{ menu: unknown; message: string }> {
    try {
      const menu = await this.prisma.menu.create({
        data: {
          name: dto.name,
          description: dto.description ?? null,
          price: dto.price,
          category: dto.category,
          cluster: dto.cluster ?? 'western_indonesian',
          restaurant: dto.restaurant ?? 'Begofood Kitchen',
          imageUrl: dto.imageUrl ?? null,
          ingredients: [],
          hiddenIngredients: [],
          sensoryProfile: [],
          allergens: [],
          tags: [],
          calories: null,
        },
      });

      await this.analysisQueue.add(
        'analyze',
        {
          menuId: menu.id,
          name: menu.name,
          description: menu.description ?? undefined,
        },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      );

      return {
        menu,
        message:
          'Menu berhasil disimpan. Analysis sedang diproses di background.',
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Gagal menyimpan menu: ${(error as Error).message}`,
      );
    }
  }
}
