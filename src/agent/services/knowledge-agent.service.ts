import { Injectable, Logger } from '@nestjs/common';
import {
  Agent,
  InMemoryRunner,
  isFinalResponse,
  stringifyContent,
} from '@google/adk';
import Exa from 'exa-js';
import { z } from 'zod';
import { NebiusProviderStrategy } from '../strategies/nebius-provider.strategy.js';

export const MENU_ANALYSIS_SCHEMA = z.object({
  ingredients: z.array(z.string()),
  allergens: z.array(z.string()),
  tags: z.array(z.string()),
  estimatedCalories: z.number().nullable(),
});

export type MenuAnalysis = z.infer<typeof MENU_ANALYSIS_SCHEMA>;

// Map ingredient → allergen yang bener
const INGREDIENT_ALLERGEN_MAP: Record<string, string[]> = {
  santan: [],
  'santan kental': [],
  'santan cair': [],
  kelapa: [],
  'minyak kelapa': [],
  tahu: ['kedelai'],
  tempe: ['kedelai'],
  kecap: ['kedelai'],
  'kecap manis': ['kedelai'],
  susu: ['susu'],
  keju: ['susu'],
  yoghurt: ['susu'],
  mentega: ['susu'],
  'mentega margarin': [],
  telur: ['telur'],
  tepung: ['gluten'],
  'tepung terigu': ['gluten'],
  mi: ['gluten'],
  mie: ['gluten'],
  roti: ['gluten'],
  pasta: ['gluten'],
  udang: ['seafood'],
  cumi: ['seafood'],
  ikan: ['seafood'],
  kepiting: ['seafood'],
  kerang: ['seafood'],
  'kacang tanah': ['kacang'],
  kacang: ['kacang'],
  'sambal kacang': ['kacang'],
  'bumbu kacang': ['kacang'],
};

function validateAllergens(
  ingredients: string[],
  detectedAllergens: string[],
): string[] {
  const valid: Set<string> = new Set();

  for (const ing of ingredients) {
    const lower = ing.toLowerCase().trim();
    // Cari di map
    for (const [key, allergens] of Object.entries(INGREDIENT_ALLERGEN_MAP)) {
      if (lower.includes(key)) {
        for (const a of allergens) valid.add(a);
      }
    }
    // Deteksi otomatis berdasarkan kata kunci
    if (/terigu|gandum|roti|mie|mi|pasta/i.test(lower)) valid.add('gluten');
    if (/udang|cumi|ikan|kepiting|kerang|seafood/i.test(lower))
      valid.add('seafood');
    if (/kacang|peanut/i.test(lower)) valid.add('kacang');
    if (/susu|keju|yoghurt|cream|krim/i.test(lower)) valid.add('susu');
    if (/telur/i.test(lower)) valid.add('telur');
    if (/kedelai|tahu|tempe|kecap|soy/i.test(lower)) valid.add('kedelai');
    if (/wijen|sesame/i.test(lower)) valid.add('wijen');
  }

  // Kalo hasil validasi kosong, pake detected (tapi filter false positive)
  if (valid.size === 0) {
    // False positive: santan → susu
    const hasSantans = ingredients.some((i) =>
      /santan|kelapa|coconut/i.test(i),
    );
    return detectedAllergens.filter((a) => {
      if (a === 'susu' && hasSantans) {
        // Cek beneran ada susu sapi?
        const hasRealDairy = ingredients.some((i) =>
          /susu sapi|susu murni|susu segar|susu uht|susu cair|susu kental|keju/i.test(
            i,
          ),
        );
        return hasRealDairy;
      }
      return true;
    });
  }

  return Array.from(valid);
}

@Injectable()
export class KnowledgeAgentService {
  private readonly logger = new Logger(KnowledgeAgentService.name);
  private runner: InMemoryRunner | null = null;
  private exaClient: Exa | null = null;
  private initialized = false;

  async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    if (process.env.EXA_API_KEY) {
      this.exaClient = new Exa(process.env.EXA_API_KEY);
      this.logger.log('Exa client siap');
    }

    const provider = new NebiusProviderStrategy();
    const model = provider.getModel();

    const agent = new Agent({
      name: 'knowledge_agent',
      model,
      instruction: `Kamu adalah ahli analisis makanan.
Analisis nama dan deskripsi menu makanan berdasarkan data dari web.

Identifikasi:
1. Bahan-bahan utama (ingredients) — detil, pisahin per bahan
2. Alergen yang mungkin terkandung (allergens) — pilih dari: kacang, susu, gluten, telur, seafood, kedelai, wijen, sulfit
   PERHATIAN: Santan/kelapa BUKAN alergen susu. Hanya susu sapi yg termasuk alergen susu.
3. Tag diet/kategori (tags) — pilih dari: vegetarian, vegan, low_carb, high_protein, halal, gluten_free, low_fat, spicy, savory, sweet
4. Estimasi kalori per porsi (estimatedCalories) — null jika tidak yakin`,
      outputSchema: MENU_ANALYSIS_SCHEMA,
    });

    this.runner = new InMemoryRunner({ agent });
    this.initialized = true;
    this.logger.log('Knowledge Agent siap (ADK + Exa)');
  }

  async analyze(name: string, description?: string): Promise<MenuAnalysis> {
    this.ensureReady();

    this.logger.log(`Menganalisis menu: "${name}"`);

    // 1. Cari referensi dari Exa
    let webContext = '';
    if (this.exaClient) {
      try {
        const query = `${name} ${description || ''} resep bahan alergen`.trim();
        const result = await this.exaClient.search(query, {
          contents: { text: { maxCharacters: 3000 } },
        });
        const results = (result as any).results || [];
        webContext = results
          .slice(0, 3)
          .map((r: any) => r.text || '')
          .filter(Boolean)
          .join('\n\n');
        if (webContext) {
          this.logger.log(`Exa: dapet ${webContext.slice(0, 50)}...`);
        }
      } catch (e) {
        this.logger.warn(`Exa search gagal: ${(e as Error).message}`);
      }
    }

    // 2. Panggil LLM
    const prompt = webContext
      ? `Data dari web tentang menu ini:\n${webContext}\n\nAnalisis menu:\nNama: ${name}\n${description ? `Deskripsi: ${description}` : ''}`
      : `Analisis menu makanan berikut:\nNama: ${name}\n${description ? `Deskripsi: ${description}` : ''}`;

    let result = '';

    try {
      for await (const event of this.runner!.runEphemeral({
        userId: 'knowledge_system',
        newMessage: { role: 'user', parts: [{ text: prompt }] },
      })) {
        if (isFinalResponse(event)) {
          result = stringifyContent(event);
        }
      }
    } catch (error) {
      this.logger.error(`Gagal "${name}": ${(error as Error).message}`);
      return this.emptyResult();
    }

    if (!result) return this.emptyResult();

    try {
      const parsed = JSON.parse(result) as MenuAnalysis;

      // Validasi allergen berdasarkan ingredients
      const validatedAllergens = validateAllergens(
        parsed.ingredients,
        parsed.allergens,
      );

      const final: MenuAnalysis = {
        ...parsed,
        allergens: validatedAllergens,
      };

      return MENU_ANALYSIS_SCHEMA.parse(final);
    } catch {
      this.logger.warn(`Gagal parse "${name}": ${result.slice(0, 100)}`);
      return this.emptyResult();
    }
  }

  private emptyResult(): MenuAnalysis {
    return {
      ingredients: [],
      allergens: [],
      tags: [],
      estimatedCalories: null,
    };
  }

  private ensureReady(): void {
    if (!this.initialized || !this.runner) {
      throw new Error('KnowledgeAgentService belum di-initialize.');
    }
  }
}
