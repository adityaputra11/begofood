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
import { calculateMenuMatchScore } from './match-score.js';

// ── Type exports untuk backend filtering ──

export interface MenuFilterInput {
  allergies?: string[];
  preferredSensory?: string[];
  preferredTastes?: string[];
  category?: string;
  search?: string;
  cluster?: string;
}

export interface FilteredMenuResult {
  safe: Array<
    Record<string, unknown> & {
      safetyStatus: 'safe';
      matchScore: number;
      matchedSensory: string[];
      matchedTastes: string[];
      recommendationReason: string;
    }
  >;
  unsafe: Array<
    Record<string, unknown> & {
      safetyStatus: 'unsafe';
      matchScore: number;
      matchedSensory: string[];
      matchedTastes: string[];
      reason: string;
    }
  >;
}

export interface UserPreferenceResult {
  allergies: string[];
  preferredSensory: string[];
  preferredTastes: string[];
  hasPreferences: boolean;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private runner: Runner | null = null;
  private sessionService: InMemorySessionService | null = null;
  private readonly sessionUsers = new Map<string, string>();
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
    this.sessionUsers.set(session.id, resolvedUserId);

    return { sessionId: session.id };
  }

  async chat(
    message: string,
    sessionId: string,
    userId?: string,
  ): Promise<string> {
    this.ensureReady();
    const resolvedUserId = userId || this.sessionUsers.get(sessionId);
    if (!resolvedUserId) {
      throw new Error(
        'Session tidak dikenali. Buat session baru atau kirim userId yang sama.',
      );
    }

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
      preferredSensory: pref?.preferredSensory ?? [],
      preferredTastes: pref?.preferredTastes ?? [],
      hasPreferences: !!pref,
    };
  }

  private normalizePreferredTastes(tags?: string[]): string[] {
    const map: Record<string, string> = {
      pedas: 'spicy',
      manis: 'sweet',
      asam: 'sour',
      gurih: 'savory',
    };
    return (tags ?? []).map((t) => map[t.toLowerCase()] || t);
  }

  private supportedValues(
    values: string[] | undefined,
    supported: readonly string[],
  ): string[] | undefined {
    if (values === undefined) return undefined;
    return [...new Set(values.filter((value) => supported.includes(value)))];
  }

  async saveUserPreference(
    userId: string,
    data: {
      allergies?: string[];
      preferredSensory?: string[];
      preferredTastes?: string[];
    },
  ): Promise<{ message: string; preferences: UserPreferenceResult }> {
    // Normalize nilai
    const normalizedData = {
      allergies: this.supportedValues(data.allergies, [
        'kacang',
        'susu',
        'telur',
        'seafood',
      ]),
      preferredSensory: this.supportedValues(data.preferredSensory, [
        'renyah',
        'lembut',
        'hangat',
        'aromatik',
      ]),
      preferredTastes: this.supportedValues(
        data.preferredTastes === undefined
          ? undefined
          : this.normalizePreferredTastes(data.preferredTastes),
        ['spicy', 'sweet', 'sour', 'savory'],
      ),
    };

    const existing = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    if (existing) {
      await this.prisma.userPreference.update({
        where: { userId },
        data: {
          ...(normalizedData.allergies !== undefined
            ? { allergies: normalizedData.allergies }
            : {}),
          ...(normalizedData.preferredSensory !== undefined
            ? { preferredSensory: normalizedData.preferredSensory }
            : {}),
          ...(normalizedData.preferredTastes !== undefined
            ? { preferredTastes: normalizedData.preferredTastes }
            : {}),
        },
      });
    } else {
      // Auto-create user record if not exists (foreign key constraint)
      await this.prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
          id: userId,
          name: userId.replace('persona-', ''),
          email: `${userId}@begofood.app`,
          password: '',
          preference: '',
        },
      });
      await this.prisma.userPreference.create({
        data: {
          userId,
          allergies: normalizedData.allergies ?? [],
          preferredSensory: normalizedData.preferredSensory ?? [],
          preferredTastes: normalizedData.preferredTastes ?? [],
        },
      });
    }

    const saved = await this.getUserPreference(userId);

    const parts: string[] = [];
    if (saved.allergies.length) {
      parts.push(`Alergi: ${saved.allergies.join(', ')}`);
    }
    if (saved.preferredSensory.length) {
      parts.push(`Sensoris: ${saved.preferredSensory.join(', ')}`);
    }
    if (saved.preferredTastes.length) {
      parts.push(`Cita rasa: ${saved.preferredTastes.join(', ')}`);
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
    const preferredSensory =
      filters?.preferredSensory ?? preferences.preferredSensory;
    const preferredTastes =
      filters?.preferredTastes ?? preferences.preferredTastes;
    const { category, search, cluster } = filters ?? {};
    const searchWhere = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            {
              description: {
                contains: search,
                mode: 'insensitive' as const,
              },
            },
          ],
        }
      : {};

    // Menu AMAN
    const safeWhere: Record<string, unknown> = {
      isAvailable: true,
      ...(allergies.length > 0
        ? { NOT: { allergens: { hasSome: allergies } } }
        : {}),
      ...(category ? { category } : {}),
      ...(cluster ? { cluster } : {}),
      ...searchWhere,
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
            ...(cluster ? { cluster } : {}),
            ...searchWhere,
          },
          orderBy: { name: 'asc' },
        })
      : [];

    return {
      safe: safeItems
        .map((item) => {
          const matchedSensory = preferredSensory.filter((value) =>
            item.sensoryProfile.includes(value),
          );
          const matchedTastes = preferredTastes.filter((value) =>
            item.tags.includes(value),
          );
          const matchScore = this.calculateMatchScore(
            item,
            { allergies, preferredSensory, preferredTastes },
          );
          const reasonParts = ['Aman dari alergi yang tersimpan'];
          if (matchedSensory.length) {
            reasonParts.push(`sesuai karakter sensoris`);
          }
          if (matchedTastes.length) {
            reasonParts.push(`sesuai preferensi cita rasa`);
          }
          return {
            ...item,
            calories: item.calories ?? null,
            safetyStatus: 'safe' as const,
            matchScore,
            matchedSensory,
            matchedTastes,
            recommendationReason: reasonParts.join(' dan '),
          };
        })
        .sort((a, b) => b.matchScore - a.matchScore),
      unsafe: unsafeItems.map((item) => {
        const triggeredAllergens = allergies.filter((a) =>
          item.allergens.includes(a),
        );
        return {
          ...item,
          calories: item.calories ?? null,
          safetyStatus: 'unsafe' as const,
          matchScore: 0,
          matchedSensory: [],
          matchedTastes: [],
          reason: [
            `Terdeteksi ${triggeredAllergens.join(', ')}`,
            item.hiddenIngredients.length
              ? `bahan tersembunyi: ${item.hiddenIngredients.join(', ')}`
              : '',
            item.crossContaminationRisk
              ? `risiko kontaminasi silang: ${item.crossContaminationRisk}`
              : '',
          ]
            .filter(Boolean)
            .join('. '),
        };
      }),
    };
  }

  /**
   * Multi-criteria weighted match score (0–100).
   *
   * Safety adalah hard constraint + base value 60.
   * Hard constraint: jika menu mengandung alergen user → langsung 0.
   * Base score 60: jika aman, dapat 60 poin otomatis (60% dari total 100).
   * 60 dipilih agar safety dominan dalam batas penelitian alergi dan cita rasa.
   * Konsisten dengan "allergen precondition filter" di Hafez et al. (2021).
   *
   * Dua kriteria personalisasi yang terpisah digunakan: kecocokan sensoris
   * (20%) dan kecocokan cita rasa (20%). Sensoris dibatasi pada renyah,
   * lembut, hangat, dan aromatik. Cita rasa dibatasi pada pedas, manis, asam,
   * dan gurih.
   *
   * Total: 60 (safety base) + 20 (sensory match) + 20 (taste match) = 100.
   *
   * Referensi utama:
   * - Hafez et al. (2021) — multi-criteria recommendation + allergen precondition
   * - Hamdollahi Oskouei & Hashemzadeh (2023) — FoodRecNet similarity scoring
   * - Brahimi (2025) — personalized menu recommendation + food allergy management
   */
  private calculateMatchScore(
    item: {
      allergens: string[];
      tags: string[];
      sensoryProfile: string[];
    },
    preferences: {
      allergies: string[];
      preferredSensory: string[];
      preferredTastes: string[];
    },
  ): number {
    return calculateMenuMatchScore(item, preferences);
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
