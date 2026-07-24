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
  description: z.string(),
  ingredients: z.array(z.string()),
  hiddenIngredients: z.array(z.string()),
  allergens: z.array(z.enum(['kacang', 'susu', 'telur', 'seafood'])),
  crossContaminationRisk: z.string().nullable(),
  sensoryProfile: z.array(
    z.enum(['renyah', 'lembut', 'hangat', 'aromatik']),
  ),
  tags: z.array(z.enum(['spicy', 'savory', 'sweet', 'sour'])),
  estimatedCalories: z.number().nullable(),
  estimatedPrice: z.number().nullable().optional(),
});

export type MenuAnalysis = z.infer<typeof MENU_ANALYSIS_SCHEMA>;
type SupportedAllergen = MenuAnalysis['allergens'][number];

function normalizeEnumValues(
  values: unknown,
  aliases: Record<string, string>,
  allowed: Set<string>,
): string[] {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.toLowerCase().trim())
        .map((value) => aliases[value] ?? value)
        .filter((value) => allowed.has(value)),
    ),
  );
}

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
): SupportedAllergen[] {
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
    const ALLOWED_ALLERGENS = new Set(['kacang', 'susu', 'telur', 'seafood']);
    return detectedAllergens.filter((a) => {
      if (a === 'susu' && hasSantans) {
        // Cek beneran ada susu sapi?
        const hasRealDairy = ingredients.some((i) =>
          /susu sapi|susu murni|susu segar|susu uht|susu cair|susu kental|keju/i.test(
            i,
          ),
        );
        return hasRealDairy && ALLOWED_ALLERGENS.has(a);
      }
      return ALLOWED_ALLERGENS.has(a);
    }) as SupportedAllergen[];
  }

  // Filter hanya empat alergen yang menjadi batas penelitian
  const ALLOWED_ALLERGENS = new Set(['kacang', 'susu', 'telur', 'seafood']);
  return Array.from(valid).filter((a) =>
    ALLOWED_ALLERGENS.has(a),
  ) as SupportedAllergen[];
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
1. Deskripsi menu (description) — buat deskripsi yang kaya dan informatif dalam 2-3 kalimat, jelaskan bahan utama, tekstur, dan cita rasa
2. Bahan-bahan utama (ingredients) — detil, pisahin per bahan
3. Bahan tersembunyi (hiddenIngredients) — bahan/alergen yang tidak terlihat langsung tetapi mungkin ada di bumbu, saus, kaldu, minyak, atau produk olahan. Tulis spesifik beserta sumbernya, contoh: "kedelai dan gluten pada kecap"
4. Alergen yang mungkin terkandung (allergens) — pilih dari: kacang, susu, telur, seafood
   PERHATIAN: Santan/kelapa BUKAN alergen susu. Hanya susu sapi yg termasuk alergen susu.
5. Risiko kontaminasi silang (crossContaminationRisk) — jelaskan singkat risiko dari alat masak, minyak goreng, atau area dapur bersama; null jika tidak ada indikasi
6. Tag cita rasa (tags) — pilih dari: spicy, savory, sweet, sour
7. Karakter sensoris (sensoryProfile) — pilih dari: renyah, lembut, hangat, aromatik
8. Estimasi kalori per porsi (estimatedCalories) — null jika tidak yakin`,
      outputSchema: MENU_ANALYSIS_SCHEMA,
    });

    this.runner = new InMemoryRunner({ agent });
    this.initialized = true;
    this.logger.log('Knowledge Agent siap (ADK + Exa)');
  }

  async analyze(
    name: string,
    description?: string,
    sourceUrl?: string,
  ): Promise<MenuAnalysis> {
    this.ensureReady();

    this.logger.log(`Menganalisis menu: "${name}"`);

    // 1. Cari referensi dari Exa
    let webContext = '';
    if (this.exaClient) {
      try {
        const query =
          `${name} ${description || ''} ${sourceUrl || ''} resep bahan alergen`.trim();
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
          // Coba ambil langsung dari event.content.parts
          try {
            const parts = (event as any).content?.parts || [];
            for (const part of parts) {
              if (part.structuredContent) {
                result = JSON.stringify(part.structuredContent);
                break;
              }
            }
          } catch {}
        }
      }
    } catch (error) {
      this.logger.error(`Gagal "${name}": ${(error as Error).message}`);
      return this.emptyResult();
    }

    if (!result) return this.emptyResult();

    // Ekstrak JSON object dari response LLM (yang mungkin ada teks sebelum/sesudah)
    let cleanResult = result.trim();
    // Hapus markdown code block
    const codeMatch = cleanResult.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeMatch) {
      cleanResult = codeMatch[1].trim();
    }
    // Cari JSON object pertama {...} di dalam string
    const jsonMatch = cleanResult.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanResult = jsonMatch[0];
    }

    try {
      const parsed = JSON.parse(cleanResult) as Record<string, unknown>;
      const ingredients = Array.isArray(parsed.ingredients)
        ? parsed.ingredients.filter(
            (ingredient): ingredient is string =>
              typeof ingredient === 'string',
          )
        : [];
      const hiddenIngredients = Array.isArray(parsed.hiddenIngredients)
        ? parsed.hiddenIngredients.filter(
            (ingredient): ingredient is string =>
              typeof ingredient === 'string',
          )
        : [];

      const sensoryProfile = normalizeEnumValues(
        parsed.sensoryProfile,
        {
          crispy: 'renyah',
          crunchy: 'renyah',
          chewy: 'lembut',
          soft: 'lembut',
          tender: 'lembut',
          warm: 'hangat',
          hot: 'hangat',
          aromatic: 'aromatik',
          fragrant: 'aromatik',
        },
        new Set(['renyah', 'lembut', 'hangat', 'aromatik']),
      ) as MenuAnalysis['sensoryProfile'];

      const tags = normalizeEnumValues(
        parsed.tags,
        {
          pedas: 'spicy',
          gurih: 'savory',
          manis: 'sweet',
          asam: 'sour',
        },
        new Set(['spicy', 'savory', 'sweet', 'sour']),
      ) as MenuAnalysis['tags'];

      const detectedAllergens = normalizeEnumValues(
        parsed.allergens,
        { peanut: 'kacang', dairy: 'susu', egg: 'telur' },
        new Set(['kacang', 'susu', 'telur', 'seafood']),
      );

      // Validasi allergen berdasarkan ingredients
      const validatedAllergens = validateAllergens(
        ingredients,
        detectedAllergens,
      );

      const final: MenuAnalysis = {
        description:
          typeof parsed.description === 'string' ? parsed.description : '',
        ingredients,
        hiddenIngredients,
        allergens: validatedAllergens,
        crossContaminationRisk:
          typeof parsed.crossContaminationRisk === 'string' &&
          parsed.crossContaminationRisk.trim()
            ? parsed.crossContaminationRisk.trim()
            : null,
        sensoryProfile,
        tags,
        estimatedCalories:
          typeof parsed.estimatedCalories === 'number'
            ? parsed.estimatedCalories
            : null,
        estimatedPrice:
          typeof parsed.estimatedPrice === 'number'
            ? parsed.estimatedPrice
            : null,
      };

      return MENU_ANALYSIS_SCHEMA.parse(final);
    } catch (parseError) {
      this.logger.warn(`Gagal parse "${name}": ${cleanResult.slice(0, 120)}`);
      this.logger.warn(`Parse error: ${(parseError as Error).message}`);
      return this.emptyResult();
    }
  }

  private emptyResult(): MenuAnalysis {
    return {
      description: '',
      ingredients: [],
      hiddenIngredients: [],
      allergens: [],
      crossContaminationRisk: null,
      sensoryProfile: [],
      tags: [],
      estimatedCalories: null,
      estimatedPrice: null,
    };
  }

  private ensureReady(): void {
    if (!this.initialized || !this.runner) {
      throw new Error('KnowledgeAgentService belum di-initialize.');
    }
  }
}
