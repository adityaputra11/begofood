# Knowledge Agent — Source Code (Inti)

**File:** `apps/backend/src/agent/services/knowledge-agent.service.ts`

```typescript
// ─── Zod Schema (outputSchema) ─────────────────────────────────
const MENU_ANALYSIS_SCHEMA = z.object({
  description: z.string(),
  ingredients: z.array(z.string()),
  allergens: z.array(z.string()),
  tags: z.array(z.string()),
  estimatedCalories: z.number().nullable(),
  estimatedPrice: z.number().nullable().optional(),
});
type MenuAnalysis = z.infer<typeof MENU_ANALYSIS_SCHEMA>;

// ─── Rule-Based Allergen Validation ───────────────────────────
// Map ingredient → allergen untuk koreksi false positive LLM
const INGREDIENT_ALLERGEN_MAP: Record<string, string[]> = {
  santan: [],          // santan BUKAN susu (false positive prevention)
  'kecap manis': ['kedelai'],
  susu: ['susu'],
  telur: ['telur'],
  udang: ['seafood'],
  kacang: ['kacang'],
  // ... sisanya similar
};

function validateAllergens(ingredients: string[], detected: string[]): string[] {
  // 1. Cocokkan ingredients dengan INGREDIENT_ALLERGEN_MAP
  // 2. Jika validasi kosong, fallback ke detected (filter false positive)
  // 3. Khusus kasus: santan → false positive susu (dicegah)
  // 4. Filter hanya 4 alergen yang didukung: kacang, susu, telur, seafood
}

// ─── Knowledge Agent Service ─────────────────────────────────
@Injectable()
export class KnowledgeAgentService {
  private runner: InMemoryRunner | null = null;
  private exaClient: Exa | null = null;

  async onModuleInit() {
    await this.initialize();
  }

  private async initialize() {
    // Inisialisasi Exa client
    this.exaClient = new Exa(process.env.EXA_API_KEY);

    // Inisialisasi ADK Agent dengan outputSchema
    const agent = new Agent({
      name: 'knowledge_agent',
      model: new NebiusProviderStrategy().getModel(), // DeepSeek V4 Pro
      instruction: `Kamu adalah ahli analisis makanan.
        Identifikasi:
        1. Deskripsi menu
        2. Bahan-bahan utama (ingredients)
        3. Alergen (allergens) — dari: kacang, susu, telur, seafood
        4. Tag cita rasa (tags)
        5. Estimasi kalori (estimatedCalories)`,
      outputSchema: MENU_ANALYSIS_SCHEMA, // ← Zod schema
    });

    this.runner = new InMemoryRunner({ agent });
  }

  async analyze(name: string, description?: string, sourceUrl?: string) {
    // 1. Cari referensi dari Exa Search Engine
    const webContext = await this.searchExa(name, description, sourceUrl);

    // 2. Panggil LLM via ADK Runner
    const prompt = `Data dari web: ${webContext}\nAnalisis menu: ${name}`;
    const result = await this.runADK(prompt);

    // 3. Parse & validasi output
    const parsed = JSON.parse(result) as MenuAnalysis;
    parsed.allergens = validateAllergens(parsed.ingredients, parsed.allergens);
    return MENU_ANALYSIS_SCHEMA.parse(parsed); // ← validasi Zod final
  }
}
```

## Alur Kerja

```
Input: nama menu + deskripsi
    ↓
[1] Exa Search → cari resep & bahan dari web
    ↓
[2] LLM (DeepSeek V4 Pro) → analisis & ekstrak data
    ↓
[3] outputSchema (Zod) → validasi struktur JSON
    ↓
[4] validateAllergens() → rule-based koreksi false positive
    ↓
[5] Zod parse final → return MenuAnalysis
```

## Output yang Dihasilkan

```json
{
  "description": "Nasi goreng dengan acar timun...",
  "ingredients": ["nasi putih", "telur", "kecap manis", ...],
  "allergens": ["telur", "kedelai"],
  "tags": ["savory"],
  "estimatedCalories": 450,
  "estimatedPrice": null
}
```
