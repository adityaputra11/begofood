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
  cluster?: string;
  sensory?: string[];
}

export interface FilteredMenuResult {
  safe: Array<
    Record<string, unknown> & {
      safetyStatus: 'safe';
      matchScore: number;
      matchedSensory: string[];
      recommendationReason: string;
    }
  >;
  unsafe: Array<
    Record<string, unknown> & {
      safetyStatus: 'unsafe';
      matchScore: number;
      matchedSensory: string[];
      reason: string;
    }
  >;
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
    const { category, search, cluster } = filters ?? {};
    const sensory = filters?.sensory ?? [];
    const normalizedDiet = diet === 'none' ? null : diet;
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
      ...(normalizedDiet ? { tags: { has: normalizedDiet } } : {}),

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
          const matchedSensory = sensory.filter((value) =>
            item.sensoryProfile.includes(value),
          );
          const matchScore = this.calculateMatchScore(
            item,
            { allergies, diet: normalizedDiet, dislikedTags },
            matchedSensory,
          );
          const reasonParts = ['Aman dari alergi yang tersimpan'];
          if (matchedSensory.length) {
            reasonParts.push(`cocok untuk rasa ${matchedSensory.join(', ')}`);
          }
          if (normalizedDiet) reasonParts.push(`sesuai diet ${normalizedDiet}`);

          return {
            ...item,
            calories: item.calories ?? null,
            safetyStatus: 'safe' as const,
            matchScore,
            matchedSensory,
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
          matchedSensory: sensory.filter((value) =>
            item.sensoryProfile.includes(value),
          ),
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
   * Safety adalah hard constraint + base value 40.
   * Hard constraint: jika menu mengandung alergen user → langsung 0.
   * Base score 40: jika aman, dapat 40 poin otomatis (40% dari total 100).
   * 40 dipilih agar safety dominan tanpa numeric weight yang bisa ditimpa.
   * Konsisten dengan "allergen precondition filter" di Hafez et al. (2021).
   *
   * Empat criteria sisanya diberi bobot dengan pertimbangan:
   *
   * 1. Diet (25%) — preferensi pola makan seperti vegetarian/vegan/low_carb
   *    bersifat binary (cocok/tidak). Bobot 25% karena diet adalah preferensi
   *   生活方式 yang signifikan tapi tidak mengancam kesehatan seperti alergi.
   *    Referensi: Kalpakoglou et al. (2025) menggunakan diet sebagai
   *    primary filter setelah allergen.
   *
   * 2. Sensory (20%) — craving sensoris bersifat situasional (user bisa milih
   *    "lagi ingin pedas" hari ini). Bobot 20% karena ini preferensi jangka
   *    pendek, bobotnya lebih rendah dari diet yang bersifat jangka panjang.
   *    Setiap sensory match = 7 poin (20/3 ≈ 7, dibulatkan). 3 sensory match
   *    = 21 → di-cap di 20. Angka 7 dipilih agar 1 match tetap ≥ 7 poin
   *    (lebih bermakna dari 0) tapi 3 match sudah maksimal.
   *    Referensi: Hamdollahi Oskouei & Hashemzadeh (2023) menggunakan
   *    similarity score berbasis atribut item.
   *
   * 3. Preferred taste (+20%) — rasa yang diinginkan (misal "pengen pedas").
   *    Bobot +20% (sama besar dengan sensory match) sebagai bonus.
   *    Menu yang cocok dengan preferensi rasa user dapat boost 20 poin.
   *    Bersifat positif (bukan penalty) sesuai framing "lagi pengen rasa apa".
   *
   * Total: 40 (safety base) + 25 (diet) + 20 (sensory) + 20 (preferred taste) = 105 max.
   *
   * Referensi utama:
   * - Hafez et al. (2021) — multi-criteria recommendation + allergen precondition
   * - Kalpakoglou et al. (2025) — AI-based nutrition scoring dengan diet & allergen
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
      diet: string | null;
      dislikedTags: string[];
    },
    matchedSensory: string[],
  ): number {
    const { allergies, diet, dislikedTags } = preferences;

    // Safety — hard constraint + base score 40.
    // Hard constraint: jika mengandung alergen user → 0, override semua criteria.
    // Base score 40: menu aman dapat 40 poin otomatis (40% dari total 100).
    // Ini memastikan safety adalah prioritas tertinggi tanpa menghitungnya
    // sebagai bobot numerik yang bisa ditimpa criteria lain.
    if (allergies.length > 0) {
      const hasAllergen = allergies.some((a) => item.allergens.includes(a));
      if (hasAllergen) return 0;
    }

    // Diet compatibility — 25%
    let dietScore = 0;
    if (diet) {
      dietScore = item.tags.includes(diet) ? 25 : 0;
    } else {
      dietScore = 25;
    }

    // Sensory match — 20%
    // Setiap match = 7 poin (20/3 ≈ 7), max 3 match = 21 → cap 20
    const sensoryScore = Math.min(20, matchedSensory.length * 7);

    // Preferred taste bonus — +20%
    let bonus = 0;
    if (
      dislikedTags.length > 0 &&
      dislikedTags.some((t) => item.tags.includes(t))
    ) {
      bonus = 20;
    }

    // Safety base — 40 poin untuk menu yang aman dari alergen.
    // Ini memastikan range score 0–100 (40 base + max 60 dari criteria lain).
    const total = 40 + dietScore + sensoryScore + bonus;
    return Math.max(0, Math.min(100, total));
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
