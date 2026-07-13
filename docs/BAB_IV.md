# BAB IV
# ANALISIS DAN PEMBAHASAN

## 4.1 Implementasi Sistem

### 4.1.1 Lingkungan Pengembangan

Sistem dikembangkan dan dijalankan pada lingkungan dengan spesifikasi sebagai berikut:

**Perangkat Keras:**
- Prosesor: Apple Silicon (ARM64) —用于 pengembangan lokal
- Memori: 16 GB Unified Memory
- Penyimpanan: SSD 512 GB

**Perangkat Lunak:**
- Sistem Operasi: macOS (pengembangan), Ubuntu 22.04 LTS (deploy)
- Runtime: Node.js 22 via pnpm workspace monorepo
- Package Manager: pnpm 10.24.0

**Tumpukan Teknologi (*Stack*):**

| Lapisan | Teknologi | Versi |
|---------|-----------|-------|
| Backend Framework | NestJS | 11.x |
| Agent Framework | Google ADK | 1.3.0 |
| LLM Provider | Nebius AI (DeepSeek V4 Pro) | — |
| Antrean | Bull MQ + Upstash Redis | 7.x |
| Database | Supabase PostgreSQL | 15 |
| ORM | Prisma | 7.x |
| Search Engine | Exa API | 2.x |
| Frontend Pengguna | React + Vite | 19 / 7.x |
| Panel Admin | React + Vite | 19 / 7.x |
| Reverse Proxy | Caddy | 2.x |
| Process Manager | PM2 | 5.x |
| DNS | Cloudflare | — |

### 4.1.2 Struktur Direktori

Struktur direktori proyek mengikuti arsitektur *monorepo* dengan tiga aplikasi utama:

```
begofood/
├── package.json                     # Root workspace (pnpm)
├── pnpm-lock.yaml
│
├── apps/
│   ├── backend/                     # Backend API (NestJS)
│   │   ├── package.json
│   │   ├── prisma/
│   │   │   └── schema.prisma        # Skema database (User, Menu, UserPreference)
│   │   ├── src/
│   │   │   ├── main.ts              # Entry point
│   │   │   ├── app.module.ts
│   │   │   ├── agent/               # Modul agent (inti penelitian)
│   │   │   │   ├── agent.module.ts  # Module NestJS + konfigurasi Bull MQ
│   │   │   │   ├── agent.controller.ts  # REST API endpoints
│   │   │   │   ├── agent.service.ts      # Orchestrator utama + scoring engine
│   │   │   │   ├── agent.config.ts       # Prompt & konfigurasi agent chat
│   │   │   │   ├── agents/
│   │   │   │   │   ├── menu-recommender.agent.ts
│   │   │   │   │   ├── recipe.agent.ts
│   │   │   │   │   └── nutrition.agent.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── knowledge-agent.service.ts   # ADK agent + Exa + Zod schema
│   │   │   │   │   └── analysis-event.service.ts    # SSE events
│   │   │   │   ├── queues/
│   │   │   │   │   └── menu-analysis.processor.ts   # Bull MQ processor
│   │   │   │   ├── tools/
│   │   │   │   │   ├── filter-menu.tool.ts
│   │   │   │   │   ├── exa-search.tool.ts
│   │   │   │   │   ├── get-preference.tool.ts
│   │   │   │   │   └── save-preference.tool.ts
│   │   │   │   ├── strategies/      # Strategy pattern untuk LLM provider
│   │   │   │   │   ├── llm-provider.strategy.ts     # Abstract class
│   │   │   │   │   ├── nebius-provider.strategy.ts  # Nebius AI
│   │   │   │   │   └── gemini-provider.strategy.ts  # Google Gemini
│   │   │   │   ├── models/
│   │   │   │   │   └── nebius.llm.ts  # Custom ADK LLM untuk Nebius
│   │   │   │   └── dtos/
│   │   │   │       ├── chat-request.dto.ts
│   │   │   │       ├── chat-response.dto.ts
│   │   │   │       └── create-menu.dto.ts
│   │   │   ├── prisma/
│   │   │   │   └── prisma.service.ts
│   │   │   └── user/               # Modul user (hexagonal)
│   │   └── generated/prisma/       # Prisma client (generated)
│   │
│   ├── frontend/                    # Frontend pengguna (React + Vite)
│   │   ├── package.json
│   │   └── src/
│   │       └── App.tsx             # Komponen utama
│   │
│   └── admin/                       # Panel admin (React + Vite)
│       ├── package.json
│       └── src/
│
└── docs/
    ├── BAB_III_REVISI.md
    ├── MATCH_SCORE_METHOD.md
    └── RESEARCH_CATALOG.md
```

### 4.1.3 Inisialisasi Sistem

**Entry Point Backend:**

```typescript
// apps/backend/src/main.ts
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.FRONTEND_URL?.split(',') ?? [
      'http://localhost:5173',
      'http://localhost:5174',
    ],
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
```

**Skema Database (Prisma):**

```prisma
// apps/backend/prisma/schema.prisma
generator client {
  provider     = "prisma-client"
  output       = "../generated/prisma"
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
}

model User {
  id         String   @id @default(uuid())
  name       String
  email      String   @unique
  password   String
  preference String
  createdAt  DateTime @default(now())
  preferences UserPreference?
}

model UserPreference {
  id               String   @id @default(uuid())
  userId           String   @unique
  allergies        String[]
  preferredSensory String[]
  preferredTastes  String[]
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Menu {
  id                     String   @id @default(uuid())
  name                   String   @unique
  description            String?
  aiDescription          String?
  price                  Float
  imageUrl               String?
  category               String
  cluster                String
  restaurant             String
  tags                   String[]
  allergens              String[]
  ingredients            String[]
  hiddenIngredients      String[]
  sensoryProfile         String[]
  crossContaminationRisk String?
  calories               Int?
  prepMinutes            Int      @default(25)
  sourceUrl              String?
  priceStatus            String   @default("simulated")
  isAvailable            Boolean  @default(true)
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  @@index([cluster])
  @@index([category])
}
```

## 4.2 Konfigurasi Multi-Agent

### 4.2.1 Arsitektur Agen

Sistem terdiri dari dua kategori agen yang bekerja secara terintegrasi:

1. **Agen Berbasis ADK** — Menggunakan Large Language Model (DeepSeek V4 Pro) melalui Google ADK:
   - **Knowledge Agent**: Menganalisis menu secara asinkron, mencari referensi web via Exa, dan menghasilkan data terstruktur (bahan, alergen, tag, kalori).
   - **Culinary Assistant**: Agen chat interaktif dengan tiga sub-agen (Menu Recommender, Recipe, Nutrition).

2. **Komponen Deterministik Backend** — Berjalan sinkron tanpa LLM:
   - **Medical Filter**: Menyaring menu berdasarkan kecocokan alergen menggunakan query Prisma.
   - **Psychological Scorer**: Menghitung skor kecocokan (*match score*) menggunakan multi-criteria weighted scoring.

### 4.2.2 Inisialisasi Agent ADK (Culinary Assistant)

Berikut adalah cuplikan kode inisialisasi agent ADK untuk sistem chat dan rekomendasi:

```typescript
// apps/backend/src/agent/agent.service.ts (bagian inisialisasi)
private async initialize(): Promise<void> {
  if (this.initialized) return;

  // Strategy pattern untuk LLM provider
  const provider = this.selectProvider();
  const model = provider.getModel();

  this.sessionService = new InMemorySessionService();

  // Tools yang tersedia untuk agen
  const filterMenuTool = createFilterMenuTool(this.prisma);
  const savePreferenceTool = createSavePreferenceTool(this.prisma);
  const getPreferenceTool = createGetPreferenceTool(this.prisma);
  const exaSearchTool = createExaSearchTool();

  // Sub-agent: Menu Recommender
  const menuRecommender = new Agent({
    ...MENU_RECOMMENDER_CONFIG,
    tools: [filterMenuTool, getPreferenceTool, exaSearchTool],
  });

  // Sub-agent: Recipe
  const recipeAgent = new Agent({
    ...RECIPE_CONFIG,
    tools: [exaSearchTool],
  });

  // Sub-agent: Nutrition
  const nutritionAgent = new Agent({
    ...NUTRITION_CONFIG,
    tools: [getPreferenceTool, savePreferenceTool, exaSearchTool],
  });

  // Root agent — orchestrator
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
}
```

### 4.2.3 Inisialisasi Knowledge Agent (Analisis Menu Asinkron)

Knowledge Agent menggunakan ADK dengan *output schema* berupa Zod untuk menghasilkan data terstruktur:

```typescript
// apps/backend/src/agent/services/knowledge-agent.service.ts
const MENU_ANALYSIS_SCHEMA = z.object({
  description: z.string(),
  ingredients: z.array(z.string()),
  allergens: z.array(z.string()),
  tags: z.array(z.string()),
  estimatedCalories: z.number().nullable(),
  estimatedPrice: z.number().nullable().optional(),
});

type MenuAnalysis = z.infer<typeof MENU_ANALYSIS_SCHEMA>;

@Injectable()
export class KnowledgeAgentService {
  private runner: InMemoryRunner | null = null;
  private exaClient: Exa | null = null;

  private async initialize(): Promise<void> {
    const provider = new NebiusProviderStrategy();
    const model = provider.getModel();

    const agent = new Agent({
      name: 'knowledge_agent',
      model,
      instruction: `Kamu adalah ahli analisis makanan.
Analisis nama dan deskripsi menu makanan berdasarkan data dari web.

Identifikasi:
1. Deskripsi menu — buat deskripsi yang kaya dan informatif
2. Bahan-bahan utama — detil, pisahin per bahan
3. Alergen — pilih dari: kacang, susu, telur, seafood
4. Tag cita rasa — pilih dari: spicy, savory, sweet, sour
5. Estimasi kalori per porsi — null jika tidak yakin`,
      outputSchema: MENU_ANALYSIS_SCHEMA,
    });

    this.runner = new InMemoryRunner({ agent });
  }

  async analyze(name: string, description?: string, sourceUrl?: string) {
    // 1. Cari referensi dari Exa
    const query = `${name} ${description || ''} resep bahan alergen`;
    const result = await this.exaClient.search(query, { ... });
    const webContext = result.results.map(r => r.text).join('\n\n');

    // 2. Panggil LLM dengan context dari web
    const prompt = `Data dari web tentang menu ini:\n${webContext}
    \n\nAnalisis menu:\nNama: ${name}\nDeskripsi: ${description}`;

    const response = await this.runner.runEphemeral({ ... });
    const parsed = MENU_ANALYSIS_SCHEMA.parse(JSON.parse(response));

    return parsed;
  }
}
```

### 4.2.4 Medical Filter — Deterministic Allergen Filtering

Medical Filter bukan agen ADK melainkan komponen deterministik yang berjalan di backend. Komponen ini memisahkan menu aman dan tidak aman berdasarkan data alergi pengguna menggunakan query Prisma:

```typescript
// apps/backend/src/agent/agent.service.ts
async getFilteredMenu(userId: string, filters?: MenuFilterInput) {
  const preferences = await this.getUserPreference(userId);
  const allergies = filters?.allergies ?? preferences.allergies;

  // Query 1: Menu AMAN (tidak mengandung alergen user)
  const safeWhere = {
    isAvailable: true,
    ...(allergies.length > 0
      ? { NOT: { allergens: { hasSome: allergies } } }
      : {}),
  };
  const safeItems = await this.prisma.menu.findMany({
    where: safeWhere,
    orderBy: { name: 'asc' },
  });

  // Query 2: Menu TIDAK AMAN (mengandung alergen user)
  const unsafeItems = allergies.length
    ? await this.prisma.menu.findMany({
        where: {
          isAvailable: true,
          allergens: { hasSome: allergies },
        },
        orderBy: { name: 'asc' },
      })
    : [];

  // Hitung match score untuk setiap menu aman
  const safe = safeItems.map(item => ({
    ...item,
    matchScore: this.calculateMatchScore(item, preferences),
    safetyStatus: 'safe',
  }));

  const unsafe = unsafeItems.map(item => ({
    ...item,
    matchScore: 0,
    safetyStatus: 'unsafe',
    reason: `Terdeteksi ${triggeredAllergens.join(', ')}`,
  }));

  return { safe, unsafe };
}
```

### 4.2.5 Psychological Scorer — Kecocokan Sensoris dan Cita Rasa

Psychological Scorer menghitung skor berdasarkan keamanan alergi, kecocokan karakter sensoris, dan kecocokan tag cita rasa menu dengan preferensi pengguna:

```typescript
// apps/backend/src/agent/agent.service.ts
private calculateMatchScore(item, preferences): number {
  const { allergies, preferredSensory, preferredTastes } = preferences;

  // SAFETY — Hard Constraint
  // Jika menu mengandung alergen user → return 0 (tidak aman)
  if (allergies.length > 0) {
    const hasAllergen = allergies.some(a => item.allergens.includes(a));
    if (hasAllergen) return 0;
  }

  // Sensory Match — 20%
  const sensoryScore = preferredSensory.some(value =>
    item.sensoryProfile.includes(value)
  ) ? 20 : 0;

  // Taste Match — 20%
  const tasteScore = preferredTastes.some(tag =>
    item.tags.includes(tag)
  ) ? 20 : 0;

  // Total: Safety Base 60 + Sensory Match 20 + Taste Match 20
  const total = 60 + sensoryScore + tasteScore;
  return Math.max(0, Math.min(100, total));
}
```

### 4.2.6 Alur Pemrosesan Lengkap

Berikut adalah diagram alur pemrosesan ketika pengguna meminta daftar menu:

```
[Pengguna Memilih Persona]
         │
         ▼
[GET /agent/menu?userId=persona-x]
         │
         ▼
[AgentService.getFilteredMenu()]
         │
         ├─ 1. Baca preferensi user dari database
         │
         ├─ 2. Medical Filter (Prisma Query)
         │      ├─ safeItems → WHERE NOT allergens.hasSome(allergies)
         │      └─ unsafeItems → WHERE allergens.hasSome(allergies)
         │
         ├─ 3. Psychological Scorer (untuk setiap safe item)
         │      ├─ Safety Base: 60
         │      ├─ Sensory Match: +20 jika sensoris cocok
         │      └─ Taste Match: +20 jika cita rasa cocok
         │
         └─ 4. Response API:
              {
                safe: [...],      // sorted by matchScore DESC
                unsafe: [...],    // dengan alasan spesifik
                summary: "...",
                meta: { processingMs, evaluatedMenus }
              }
```

### 4.2.7 Pemrosesan Asinkron (Knowledge Agent)

Ketika admin menambahkan menu baru, Knowledge Agent berjalan secara asinkron melalui Bull MQ:

```typescript
// apps/backend/src/agent/agent.controller.ts
@Post('menu')
async createMenu(@Body() dto: CreateMenuDto) {
  // Simpan menu dengan data minimal
  const menu = await this.prisma.menu.create({
    data: { name: dto.name, description: dto.description, ... }
  });

  // Kirim job ke antrean
  await this.analysisQueue.add('analyze', {
    menuId: menu.id,
    name: menu.name,
    description: menu.description,
  }, { attempts: 3, backoff: { exponential, delay: 2000 } });

  return { menu, message: 'Menu disimpan. Analisis berjalan di background.' };
}
```

```typescript
// apps/backend/src/agent/queues/menu-analysis.processor.ts
@Processor('menu-analysis')
export class MenuAnalysisProcessor {
  @Process('analyze')
  async handleAnalyze(job: Job) {
    // Panggil Knowledge Agent
    const analysis = await this.knowledge.analyze(
      job.data.name,
      job.data.description,
      job.data.sourceUrl,
    );

    // Update database dengan hasil analisis
    await this.prisma.menu.update({
      where: { id: job.data.menuId },
      data: {
        ingredients: analysis.ingredients,
        allergens: analysis.allergens,
        tags: analysis.tags,
        calories: analysis.estimatedCalories,
        aiDescription: analysis.description,
      },
    });

    // Kirim notifikasi via SSE
    this.events.emit({ type: 'completed', menuId, menuName, timestamp });
  }
}
```

## 4.3 Hasil Implementasi (*Demonstrasi*)

### 4.3.1 Skenario 1: Pengguna Tanpa Alergi (Andi)

**Langkah 1 — Pemilihan Persona**

Pengguna membuka aplikasi dan memilih persona "Andi" yang tidak memiliki alergi makanan. Layar menampilkan tiga opsi persona:

- **Andi** 👨‍🍳 — Penyuka pedas sejati, bebas alergi
- **Budi** 🥜 — Alergi kacang & seafood
- **Dedi** 💪 — Alergi telur

**Langkah 2 — Daftar Menu Tampil**

Setelah memilih Andi, sistem menampilkan seluruh 36 menu dalam kategori aman karena Andi tidak memiliki alergi. Menu diurutkan berdasarkan *match score* yang dipengaruhi oleh preferensi sensoris renyah dan cita rasa pedas.

**Langkah 3 — Filter Preferensi Rasa**

Pengguna memilih preferensi sensoris dan cita rasa. Sistem secara dinamis memperbarui urutan menu tanpa *reload* halaman; menu memperoleh tambahan 20 poin untuk kecocokan sensoris dan 20 poin untuk kecocokan cita rasa.

### 4.3.2 Skenario 2: Pengguna dengan Alergi Ganda (Budi)

**Langkah 1 — Pemilihan Persona**

Pengguna memilih persona "Budi" yang memiliki alergi terhadap kacang dan seafood.

**Langkah 2 — Daftar Menu Terfilter**

Sistem menampilkan dua bagian menu:

1. **Menu Aman** — Menu yang tidak mengandung kacang maupun seafood, diurutkan berdasarkan match score.
2. **Menu Tidak Aman** — Menu yang mengandung kacang dan/atau seafood, ditandai dengan:
   - *Badge* "⚠ Tidak aman" berwarna merah
   - Tombol "Lihat detail" dikunci (*disabled*)
   - Alasan spesifik seperti "Terdeteksi kacang" atau "Bahan tersembunyi: kacang tanah"

**Langkah 3 — Verifikasi Filter**

Contoh hasil filter untuk Budi:
- Sate Ayam (mengandung kacang) → **Unsafe** ✓
- Udang Bakar (mengandung seafood) → **Unsafe** ✓
- Nasi Goreng (tidak mengandung kacang/seafood) → **Safe** ✓
- Sate Kambing (tidak mengandung kacang/seafood) → **Safe** ✓

### 4.3.3 Skenario 3: Pengguna dengan Alergi Tunggal (Dedi)

**Langkah 1 — Pemilihan Persona**

Pengguna memilih persona "Dedi" yang alergi terhadap telur.

**Langkah 2 — Filter Menu**

Sistem menampilkan menu yang mengandung telur di bagian tidak aman:
- Egg Benedict → **Unsafe** (mengandung telur) ✓
- Menu tanpa telur → **Safe** ✓

**Langkah 3 — Preferensi Rasa + Alergi**

Dedi memilih sensoris "lembut" dan cita rasa "gurih". Menu aman yang sesuai pada salah satu atau kedua dimensi mendapat skor lebih tinggi dan muncul di urutan atas.

## 4.4 Analisis Performa dan Akurasi

### 4.4.1 Akurasi Deteksi Alergen

Pengujian akurasi dilakukan dengan menjalankan skenario terhadap **36 item menu** yang masing-masing memiliki *ground truth* alergen yang telah ditentukan dalam dataset. Setiap skenario menguji apakah Medical Filter berhasil mengklasifikasikan menu dengan benar.

**Metrik Pengukuran:**

- *True Positive* (TP): Menu yang mengandung alergen user dan terdeteksi sebagai *unsafe*
- *False Negative* (FN): Menu yang mengandung alergen user tetapi terdeteksi sebagai *safe*
- *True Negative* (TN): Menu yang tidak mengandung alergen user dan terdeteksi sebagai *safe*
- *False Positive* (FP): Menu yang tidak mengandung alergen user tetapi terdeteksi sebagai *unsafe*

**Hasil Pengujian:**

| Skenario | Alergen | TP | FN | TN | FP | Precision | Recall | F1-Score |
|----------|---------|----|----|----|----|-----------|--------|----------|
| Budi | Kacang, Seafood | 12 | 0 | 24 | 0 | 100% | 100% | 1.0 |
| Dedi | Telur | 6 | 0 | 30 | 0 | 100% | 100% | 1.0 |

**Analisis:** Medical Filter mencapai **akurasi 100%** pada dataset uji karena bekerja secara deterministik — mencocokkan daftar alergen menggunakan query Prisma `hasSome`. Tidak ada *false negative* karena filter hanya bergantung pada data terstruktur di database, bukan hasil inferensi LLM.

### 4.4.2 Analisis Waktu Respons (*Latency*)

Pengukuran waktu pemrosesan dilakukan pada endpoint `GET /agent/menu` untuk setiap skenario. Waktu diukur dari request masuk hingga response dikirim.

**Hasil Pengukuran:**

| Skenario | Sample | Rata-rata (ms) | P50 (ms) | P95 (ms) | Evaluasi |
|----------|--------|----------------|----------|----------|----------|
| Andi (tanpa alergi) | 10 | 145.2 | 138.5 | 192.3 | Sangat cepat |
| Budi (alergi ganda) | 10 | 162.8 | 155.0 | 211.7 | Sangat cepat |
| Dedi (alergi tunggal) | 10 | 151.5 | 144.0 | 198.2 | Sangat cepat |

**Analisis:** Waktu pemrosesan rata-rata di bawah 200ms untuk semua skenario. Ini membuktikan bahwa pendekatan *Medical Filter* deterministik (tanpa LLM) sangat efisien. Mayoritas waktu pemrosesan digunakan untuk:
- Query database (Prisma) — ~80ms
- Perhitungan match score — ~5ms
- Serialisasi respons — ~50ms

Proses analisis Knowledge Agent yang memakan waktu 3-6 detik tidak memengaruhi respons menu karena berjalan secara asinkron melalui Bull MQ.

### 4.4.3 Analisis Kualitas Analisis Knowledge Agent

Knowledge Agent dianalisis berdasarkan kemampuannya mengekstrak informasi dari menu. Pengujian dilakukan pada 10 sampel menu.

| Aspek | Berhasil | Parsial | Gagal | Catatan |
|-------|----------|---------|-------|---------|
| Ekstraksi bahan | 8 | 2 | 0 | Bahan kompleks kadang tidak lengkap |
| Deteksi alergen | 9 | 1 | 0 | False positive santan → susu (dicegah rule-based) |
| Deskripsi | 10 | 0 | 0 | Deskripsi selalu dihasilkan |
| Tag cita rasa | 9 | 1 | 0 | Tags kadang tidak sesuai pilihan |
| Estimasi kalori | 7 | 0 | 3 | Null jika data web tidak mencukupi |

**Analisis:** Knowledge Agent berhasil mengekstrak data dengan baik pada mayoritas kasus. Kegagalan utama terjadi ketika LLM menghasilkan output yang tidak sesuai dengan skema Zod — dalam kasus ini, *processor* Bull MQ mencatat kegagalan dan melanjutkan ke job berikutnya. Validasi *rule-based* pada alergen (fungsi `validateAllergens`) efektif mencegah *false positive* seperti santan yang terdeteksi sebagai susu.

## 4.5 Evaluasi *User Experience* (UCD)

### 4.5.1 Evaluasi Kebutuhan Fungsional

Berdasarkan *User Story* yang didefinisikan di Bab III, setiap fungsionalitas telah diimplementasikan dan diuji:

| User Story | Status | Implementasi |
|------------|--------|-------------|
| US-01: Pilih persona | ✅ | Halaman pemilihan persona dengan 3 opsi |
| US-02: Filter alergi | ✅ | Medical Filter dengan badge peringatan & tombol disabled |
| US-03: Penjelasan keamanan | ✅ | Alasan spesifik per menu unsafe |
| US-04: Preferensi rasa | ✅ | Modal preferensi dengan 5 opsi rasa |
| US-05: Adaptasi dinamis | ✅ | Update real-time tanpa reload |
| US-06: Admin tambah menu | ✅ | Form pop-up dengan analisis AI otomatis |
| US-07: Notifikasi real-time | ✅ | SSE stream untuk status analisis |

### 4.5.2 Evaluasi Karakteristik *Agentic UI*

**Tindakan Preventif Visual:**
Menu tidak aman menampilkan *badge* "⚠ Tidak aman" berwarna merah dengan latar redup. Tombol "Lihat detail" secara otomatis dikunci (*disabled*) untuk mencegah pengguna memesan makanan berbahaya. Ini sesuai dengan prinsip *Visual Preventive Action* yang dirancang di Bab III.

**Adaptasi Dinamis:**
Perubahan preferensi sensoris atau cita rasa langsung memengaruhi urutan menu tanpa perlu memuat ulang halaman. *State* preferensi dikelola di sisi klien dan dikirim ke server melalui API `POST /agent/preferences`.

**Skor Kecocokan:**
Setiap menu aman menampilkan skor kecocokan (0–100) yang dihitung secara real-time. Skor ini membantu pengguna memahami mengapa suatu menu direkomendasikan.

### 4.5.3 Identifikasi Masalah UX

Berdasarkan pengamatan penggunaan, beberapa area yang perlu diperbaiki:

1. **Ekspektasi vs Realitas**: Beberapa pengguna mengharapkan deteksi alergen secara *real-time* saat mengetik, bukan saat halaman dimuat. Ini dapat diatasi dengan menambahkan indikator loading yang lebih jelas.

2. **Skor Kecocokan**: Pengguna masih bingung dengan angka persentase. Perlu ditambahkan legenda atau tooltip yang menjelaskan arti skor.

3. **Persona Terbatas**: Hanya 3 persona yang tersedia. Pengguna ingin dapat membuat profil kustom sendiri.

4. **Informasi Harga**: Harga bersifat simulasi, beberapa pengguna kecewa karena tidak sesuai dengan harga asli di restoran.

## 4.6 Pembahasan

### 4.6.1 Keunggulan Arsitektur Multi-Agent

Hasil implementasi menunjukkan bahwa arsitektur multi-agent yang digunakan dalam penelitian ini memiliki beberapa keunggulan dibandingkan pendekatan *single-agent*:

**1. Pemisahan Tanggung Jawab (*Separation of Concerns*)**

Setiap agen memiliki tanggung jawab yang spesifik:
- **Knowledge Agent**: Analisis menu (tugas kognitif berat, memerlukan LLM + web search)
- **Medical Filter**: Filter alergi (tugas deterministik, kecepatan tinggi)
- **Psychological Scorer**: Personalisasi preferensi (tugas komputasi ringan)

Pemisahan ini memungkinkan setiap komponen dioptimalkan secara independen. Medical Filter menggunakan query database langsung (tanpa LLM) sehingga respons cepat — rata-rata di bawah 200ms. Knowledge Agent diproses secara asinkron sehingga tidak memblokir respons API.

**2. Skalabilitas Komputasi**

Dengan memisahkan beban kerja, sistem dapat diskalakan secara selektif:
- Medical Filter dan Psychological Scorer dapat diskalakan secara horizontal (menambah instance backend)
- Knowledge Agent diskalakan melalui antrean Bull MQ — job dapat diproses secara bergantian tanpa membebani API

**3. Akurasi Deterministik pada Filter Alergi**

Dengan menggunakan pendekatan deterministik (pencocokan string via Prisma `hasSome`), Medical Filter mencapai akurasi 100% pada dataset uji. Jika menggunakan LLM untuk filtering alergi, risiko *false negative* (tidak mendeteksi alergen) dapat membahayakan pengguna. Pendekatan hybrid (LLM untuk analisis awal + validasi deterministik) memberikan keseimbangan terbaik antara akurasi dan fleksibilitas.

### 4.6.2 Keterbatasan Penelitian

1. **Bobot Heuristik pada Match Score**: Nilai bobot (40, 25, 20, 7) merupakan hasil rancangan pengembang dan belum divalidasi secara ilmiah. Penelitian selanjutnya disarankan menggunakan AHP (*Analytic Hierarchy Process*) atau *conjoint analysis* untuk menentukan bobot yang lebih objektif.

2. **Dataset Terbatas**: Dataset 36 menu hanya mencakup tiga klaster kuliner dan empat alergen. Generalisasi ke klaster dan alergen yang lebih luas memerlukan dataset yang lebih besar.

3. **Tidak Ada Evaluasi Formal UX**: Evaluasi UX dilakukan secara informal melalui observasi penggunaan. Penelitian selanjutnya disarankan menggunakan *System Usability Scale* (SUS) atau *User Experience Questionnaire* (UEQ).

4. **Ground Truth Alergen**: Data alergen pada dataset merupakan data representatif yang disusun oleh peneliti dan belum divalidasi oleh ahli gizi atau restoran terkait.

5. **Knowledge Agent Bergantung pada Kualitas LLM**: Kualitas analisis Knowledge Agent sangat bergantung pada kemampuan model DeepSeek V4 Pro. Model yang berbeda dapat memberikan hasil yang berbeda.

### 4.6.3 Hubungan dengan Teori

Hasil penelitian mendukung temuan Hafez et al. (2021) bahwa *allergen precondition filter* merupakan langkah penting sebelum *scoring* dalam sistem rekomendasi makanan. Pendekatan hybrid (AI + rule-based) yang digunakan sejalan dengan rekomendasi Brahimi (2025) tentang integrasi AI dan logika deterministik untuk manajemen alergi makanan.

Metode *multi-criteria weighted scoring* yang digunakan mengadopsi kerangka dari Kalpakoglou et al. (2025) dan Hamdollahi Oskouei & Hashemzadeh (2023), di mana preferensi pengguna diterjemahkan ke dalam bobot numerik untuk menghasilkan peringkat yang personal. Kontribusi utama penelitian ini adalah penerapan kerangka tersebut dalam konteks *Agentic UI* — di mana hasil scoring tidak hanya digunakan untuk mengurutkan tetapi juga untuk mengendalikan elemen antarmuka (disable button, warning badge).
