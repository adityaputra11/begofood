import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Sse,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { Observable, interval, map, merge } from 'rxjs';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service.js';
import { AgentService } from './agent.service.js';
import { KnowledgeAgentService } from './services/knowledge-agent.service.js';
import { AnalysisEventService } from './services/analysis-event.service.js';
import { ChatRequestDto } from './dtos/chat-request.dto.js';
import { ChatResponseDto } from './dtos/chat-response.dto.js';
import { CreateMenuDto } from './dtos/create-menu.dto.js';
import { MENU_ANALYSIS_QUEUE } from './queues/menu-analysis.processor.js';

const PERSONAS = [
  {
    id: 'persona-andi',
    name: 'Andi',
    emoji: '👨‍🍳',
    bio: 'Penyuka pedas sejati — bebas alergi, pantang hambar',
    preferences: {
      allergies: [],
      preferredSensory: ['renyah'],
      preferredTastes: ['spicy'],
    },
  },
  {
    id: 'persona-budi',
    name: 'Budi',
    emoji: '🥜',
    bio: 'Alergi kacang & seafood — harus ekstra hati-hati',
    preferences: {
      allergies: ['kacang', 'seafood'],
      preferredSensory: ['hangat'],
      preferredTastes: ['savory'],
    },
  },
  {
    id: 'persona-dedi',
    name: 'Dedi',
    emoji: '💪',
    bio: 'Alergi telur — hindari telur & olahannya',
    preferences: {
      allergies: ['telur'],
      preferredSensory: ['lembut'],
      preferredTastes: ['savory'],
    },
  },
];

@Controller('agent')
export class AgentController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agentService: AgentService,
    private readonly knowledge: KnowledgeAgentService,
    private readonly events: AnalysisEventService,
    @InjectQueue(MENU_ANALYSIS_QUEUE)
    private readonly analysisQueue: Queue,
  ) {}

  @Get('personas')
  @HttpCode(HttpStatus.OK)
  getPersonas() {
    return PERSONAS;
  }

  @Get('menus')
  @HttpCode(HttpStatus.OK)
  async getAllMenus() {
    try {
      const menus = await this.prisma.menu.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return { data: menus, total: menus.length };
    } catch (error) {
      throw new InternalServerErrorException(
        `Gagal memuat menu: ${(error as Error).message}`,
      );
    }
  }

  @Get('menu/:id')
  @HttpCode(HttpStatus.OK)
  async getMenu(@Param('id') id: string) {
    try {
      const menu = await this.prisma.menu.findUnique({ where: { id } });
      if (!menu) throw new Error('Menu tidak ditemukan');
      return menu;
    } catch (error) {
      throw new InternalServerErrorException(
        `Gagal memuat menu: ${(error as Error).message}`,
      );
    }
  }

  @Put('menu/:id')
  @HttpCode(HttpStatus.OK)
  async updateMenu(
    @Param('id') id: string,
    @Body() dto: Record<string, unknown>,
  ) {
    try {
      const menu = await this.prisma.menu.update({
        where: { id },
        data: dto,
      });
      return { menu, message: 'Menu berhasil diupdate' };
    } catch (error) {
      throw new InternalServerErrorException(
        `Gagal mengupdate menu: ${(error as Error).message}`,
      );
    }
  }

  @Delete('menu/:id')
  @HttpCode(HttpStatus.OK)
  async deleteMenu(@Param('id') id: string) {
    try {
      await this.prisma.menu.delete({ where: { id } });
      return { message: 'Menu berhasil dihapus' };
    } catch (error) {
      throw new InternalServerErrorException(
        `Gagal menghapus menu: ${(error as Error).message}`,
      );
    }
  }

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
    @Body() dto: { name: string; description?: string; menuId?: string },
  ): Promise<{ name: string; saved: boolean; message: string }> {
    try {
      if (dto.menuId) {
        // Emit event + queue background job (sama kaya createMenu)
        this.events.emit({
          type: 'started',
          menuId: dto.menuId,
          menuName: dto.name,
          timestamp: new Date().toISOString(),
        });

        await this.analysisQueue.add(
          'analyze',
          {
            menuId: dto.menuId,
            name: dto.name,
            description: dto.description ?? undefined,
          },
          { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
        );

        return {
          name: dto.name,
          saved: true,
          message: 'Analysis queued in background',
        };
      }

      return {
        name: dto.name,
        saved: false,
        message: 'No menuId provided — analysis skipped',
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Gagal mengantre analysis: ${(error as Error).message}`,
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
      preferredSensory?: string[];
      preferredTastes?: string[];
    },
  ) {
    try {
      return await this.agentService.saveUserPreference(dto.userId, {
        allergies: dto.allergies,
        preferredSensory: dto.preferredSensory,
        preferredTastes: dto.preferredTastes,
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
  ) {
    try {
      const startedAt = performance.now();
      const result = await this.agentService.getFilteredMenu(userId, {
        category,
        search,
        cluster,
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

  @Sse('analysis/stream')
  @HttpCode(HttpStatus.OK)
  analysisStream(): Observable<MessageEvent> {
    const analysisEvents = this.events.stream.pipe(
      map((event) => ({
        type: 'message',
        data: JSON.stringify(event),
      })),
    );

    // Keep the connection active through Cloudflare and Nginx while an AI
    // analysis is running. Without periodic bytes, idle SSE connections can
    // be closed by an upstream proxy and surface as HTTP 524.
    const heartbeat = interval(25_000).pipe(
      map(() => ({
        type: 'heartbeat',
        data: JSON.stringify({ timestamp: new Date().toISOString() }),
      })),
    );

    return merge(analysisEvents, heartbeat);
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
          sourceUrl: dto.sourceUrl ?? null,
          price: dto.price ?? 0,
          category: dto.category ?? 'main_course',
          cluster: dto.cluster ?? 'western_indonesian',
          restaurant: dto.restaurant ?? 'Menu Recommendation Kitchen',
          imageUrl: dto.imageUrl ?? null,
          ingredients: [],
          hiddenIngredients: [],
          sensoryProfile: [],
          allergens: [],
          tags: [],
          calories: null,
        },
      });

      this.events.emit({
        type: 'started',
        menuId: menu.id,
        menuName: menu.name,
        timestamp: new Date().toISOString(),
      });

      await this.analysisQueue.add(
        'analyze',
        {
          menuId: menu.id,
          name: menu.name,
          description: menu.description ?? undefined,
          sourceUrl: menu.sourceUrl ?? undefined,
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
