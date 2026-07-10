import { Injectable, Logger } from '@nestjs/common';
import {
  Agent,
  AgentTool,
  Runner,
  InMemorySessionService,
  isFinalResponse,
  stringifyContent,
} from '@google/adk';
import { PrismaService } from '../prisma/prisma.service.js';
import { AGENT_CONFIG } from './agent.config.js';
import { LlmProviderStrategy } from './strategies/llm-provider.strategy.js';
import { NebiusProviderStrategy } from './strategies/nebius-provider.strategy.js';
import { GeminiProviderStrategy } from './strategies/gemini-provider.strategy.js';
import { MENU_RECOMMENDER_CONFIG } from './agents/menu-recommender.agent.js';
import { RECIPE_CONFIG } from './agents/recipe.agent.js';
import { NUTRITION_CONFIG } from './agents/nutrition.agent.js';
import { createFilterMenuTool } from './tools/filter-menu.tool.js';
import { createSavePreferenceTool } from './tools/save-preference.tool.js';
import { createGetPreferenceTool } from './tools/get-preference.tool.js';
import { createExaSearchTool } from './tools/exa-search.tool.js';

// ── Type exports untuk backend filtering ──

export interface MenuFilterInput {
  allergies?: string[];
  diet?: string;
  dislikedTags?: string[];
  category?: string;
  search?: string;
}

export interface FilteredMenuResult {
  safe: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
    category: string;
    tags: string[];
    allergens: string[];
    calories: number | null;
  }>;
  unsafe: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
    category: string;
    tags: string[];
    allergens: string[];
    calories: number | null;
    reason: string;
  }>;
}

export interface UserPreferenceResult {
  allergies: string[];
  diet: string | null;
  dislikedTags: string[];
  hasPreferences: boolean;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private runner: Runner | null = null;
  private sessionService: InMemorySessionService | null = null;
  private initialized = false;

  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  //  INIT — panggil otomatis saat module start
  // ──────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    // Pilih provider strategy
    const provider = this.selectProvider();
    const model = provider.getModel();
    const modelLabel = typeof model === 'string' ? model : model.model;
    this.logger.log(`Provider: ${provider.provider} | Model: ${modelLabel}`);

    this.sessionService = new InMemorySessionService();

    // Tools
    const filterMenuTool = createFilterMenuTool(this.prisma);
    const savePreferenceTool = createSavePreferenceTool(this.prisma);
    const getPreferenceTool = createGetPreferenceTool(this.prisma);
    const exaSearchTool = createExaSearchTool();

    // Sub-agents
    const menuRecommender = new Agent({
      ...MENU_RECOMMENDER_CONFIG,
      tools: [filterMenuTool, getPreferenceTool, exaSearchTool],
    });

    const recipeAgent = new Agent({
      ...RECIPE_CONFIG,
      tools: [exaSearchTool],
    });

    const nutritionAgent = new Agent({
      ...NUTRITION_CONFIG,
      tools: [getPreferenceTool, savePreferenceTool, exaSearchTool],
    });
    // Root agent
    const rootAgent = new Agent({
      name: 'culinary_assistant',
      instruction: AGENT_CONFIG.instruction,
      globalInstruction: AGENT_CONFIG.globalInstruction,
      model,
      tools: [
        new AgentTool({ agent: menuRecommender, skipSummarization: false }),
        new AgentTool({ agent: recipeAgent, skipSummarization: false }),
        new AgentTool({ agent: nutritionAgent, skipSummarization: false }),
        savePreferenceTool,
      ],
    });

    this.runner = new Runner({
      appName: AGENT_CONFIG.appName,
      agent: rootAgent,
      sessionService: this.sessionService,
    });

    this.initialized = true;
    this.logger.log('Agent siap — chat + backend filtering');
  }

  // ──────────────────────────────────────────────
  //  1. CHAT BOT — via ADK Runner
  // ──────────────────────────────────────────────

  async createSession(userId?: string): Promise<{ sessionId: string }> {
    this.ensureReady();
    const resolvedUserId = userId || `user_${crypto.randomUUID()}`;

    const session = await this.sessionService!.createSession({
      appName: AGENT_CONFIG.appName,
      userId: resolvedUserId,
      state: {},
    });

    return { sessionId: session.id };
  }

  async chat(
    message: string,
    sessionId: string,
    userId?: string,
  ): Promise<string> {
    this.ensureReady();
    const resolvedUserId = userId || `user_${crypto.randomUUID()}`;

    let response = '';

    try {
      for await (const event of this.runner!.runAsync({
        userId: resolvedUserId,
        sessionId,
        newMessage: { role: 'user', parts: [{ text: message }] },
      })) {
        if (isFinalResponse(event)) {
          response = stringifyContent(event);
        }
      }
    } catch (error) {
      this.logger.error(`Agent run failed: ${(error as Error).message}`);
      throw error;
    }

    return (
      response ||
      'Maaf, saya tidak dapat menghasilkan respons saat ini. Silakan coba lagi.'
    );
  }

  // ──────────────────────────────────────────────
  //  2. BACKEND FILTER — langsung pake Prisma
  // ──────────────────────────────────────────────

  async getUserPreference(userId: string): Promise<UserPreferenceResult> {
    const pref = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    return {
      allergies: pref?.allergies ?? [],
      diet: pref?.diet ?? null,
      dislikedTags: pref?.dislikedTags ?? [],
      hasPreferences: !!pref,
    };
  }

  private normalizeDislikedTags(tags?: string[]): string[] {
    const map: Record<string, string> = {
      pedas: 'spicy',
      manis: 'sweet',
      asam: 'sour',
      gurih: 'savory',
      pahit: 'savory',
    };
    return (tags ?? []).map((t) => map[t.toLowerCase()] || t);
  }

  async saveUserPreference(
    userId: string,
    data: { allergies?: string[]; diet?: string; dislikedTags?: string[] },
  ): Promise<{ message: string; preferences: UserPreferenceResult }> {
    // Normalize nilai
    const normalizedData = {
      ...data,
      dislikedTags: this.normalizeDislikedTags(data.dislikedTags),
    };

    const existing = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    if (existing) {
      await this.prisma.userPreference.update({
        where: { userId },
        data: {
          ...(data.allergies !== undefined
            ? { allergies: data.allergies }
            : {}),
          ...(data.diet !== undefined ? { diet: data.diet } : {}),
          ...(normalizedData.dislikedTags !== undefined
            ? { dislikedTags: normalizedData.dislikedTags }
            : {}),
        },
      });
    } else {
      await this.prisma.userPreference.create({
        data: {
          userId,
          allergies: data.allergies ?? [],
          diet: data.diet ?? null,
          dislikedTags: normalizedData.dislikedTags ?? [],
        },
      });
    }

    const saved = await this.getUserPreference(userId);

    const parts: string[] = [];
    if (saved.allergies.length) {
      parts.push(`Alergi: ${saved.allergies.join(', ')}`);
    }
    if (saved.diet) {
      parts.push(`Diet: ${saved.diet}`);
    }
    if (saved.dislikedTags.length) {
      parts.push(`Gak suka: ${saved.dislikedTags.join(', ')}`);
    }

    return {
      message: parts.length
        ? `Preferensi tersimpan — ${parts.join('. ')}.`
        : 'Preferensi berhasil disimpan.',
      preferences: saved,
    };
  }

  async getFilteredMenu(
    userId: string,
    filters?: MenuFilterInput,
  ): Promise<FilteredMenuResult> {
    const preferences = await this.getUserPreference(userId);

    const allergies = filters?.allergies ?? preferences.allergies;
    const diet = filters?.diet ?? preferences.diet;
    const dislikedTags = filters?.dislikedTags ?? preferences.dislikedTags;
    const { category, search } = filters ?? {};

    // Menu AMAN
    const safeWhere: Record<string, unknown> = {
      isAvailable: true,
      ...(allergies.length > 0
        ? { NOT: { allergens: { hasSome: allergies } } }
        : {}),
      ...(diet ? { tags: { has: diet } } : {}),
      ...(dislikedTags.length > 0
        ? { NOT: { tags: { hasSome: dislikedTags } } }
        : {}),
      ...(category ? { category } : {}),
      ...(search
        ? { name: { contains: search, mode: 'insensitive' as const } }
        : {}),
    };

    const safeItems = await this.prisma.menu.findMany({
      where: safeWhere,
      orderBy: { name: 'asc' },
    });

    // Menu TIDAK AMAN
    const unsafeItems = allergies.length
      ? await this.prisma.menu.findMany({
          where: {
            isAvailable: true,
            allergens: { hasSome: allergies },
            ...(category ? { category } : {}),
            ...(search
              ? { name: { contains: search, mode: 'insensitive' as const } }
              : {}),
          },
          orderBy: { name: 'asc' },
        })
      : [];

    return {
      safe: safeItems.map((item) => ({
        ...item,
        calories: item.calories ?? null,
      })),
      unsafe: unsafeItems.map((item) => {
        const triggeredAllergens = allergies.filter((a) =>
          item.allergens.includes(a),
        );
        return {
          ...item,
          calories: item.calories ?? null,
          reason: `Mengandung ${triggeredAllergens.join(', ')}`,
        };
      }),
    };
  }

  // ──────────────────────────────────────────────
  //  HELPERS
  // ──────────────────────────────────────────────

  private selectProvider(): LlmProviderStrategy {
    const name = process.env.LLM_PROVIDER?.toLowerCase() || 'nebius';

    switch (name) {
      case 'gemini':
        return new GeminiProviderStrategy();
      case 'nebius':
        return new NebiusProviderStrategy();
      default:
        this.logger.warn(
          `Provider "${name}" tidak dikenal. Fallback ke nebius.`,
        );
        return new NebiusProviderStrategy();
    }
  }

  private ensureReady(): void {
    if (!this.initialized || !this.runner || !this.sessionService) {
      throw new Error('AgentService belum di-initialize.');
    }
  }
}
