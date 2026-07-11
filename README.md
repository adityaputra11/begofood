# Begofood AI

Purwarupa skripsi sistem rekomendasi menu berbasis **multi-agent AI** dengan Google ADK, NestJS, Prisma/PostgreSQL, Bull MQ, dan React Vite. Sistem memadukan **Medical Agent** (filter alergi) dan **Psychological Agent** (preferensi rasa) untuk menyaring serta merekomendasikan menu.

## Fitur Utama

- **Multi-Agent AI** — Google ADK dengan DeepSeek V4 Pro + Exa search untuk analisis menu otomatis
- **Medical Agent** — filter menu berdasarkan alergi (kacang, susu, telur, seafood)
- **Psychological Agent** — cocokkan preferensi rasa (pedas, manis, pahit, gurih) dengan sensory profile menu
- **Background Analysis** — Bull MQ + Redis untuk async processing analisis menu via AI
- **Real-time Notifikasi** — SSE stream untuk progress analysis (Admin panel)
- **Match Score** — multi-criteria weighted scoring (safety 40 + sensory 20 + preferred taste 20)
- **Persona System** — 3 persona bawaan (Andi, Budi, Dedi) dengan preferensi berbeda
- **Admin Panel** — CRUD menu, trigger analysis ulang, login auth (admin/Password123!)
- **36 Menu Riset** — dari 3 klaster restoran (Western & Indonesia, Chinese Food, Seafood)
- **UI Responsif** — desktop & mobile dengan preventive action

## Struktur Monorepo

```text
apps/
├── backend/     # NestJS, Google ADK, Prisma, Bull MQ, Redis
├── frontend/    # React (Vite) — User app (port 5173)
└── admin/       # React (Vite) — Admin panel (port 5174)
docs/
├── RESEARCH_CATALOG.md      # Detail dataset 36 menu
└── MATCH_SCORE_METHOD.md    # Metode scoring multi-criteria
```

## Persyaratan

- Node.js 20+
- pnpm
- PostgreSQL (via Supabase)
- Redis (via Upstash)
- API Key: Nebius AI, Exa Search

## Menjalankan Lokal

1. Salin `apps/backend/.env.example` → `apps/backend/.env`, isi kredensial:

```env
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
NEBIUS_API_KEY="..."
EXA_API_KEY="..."
AGENT_MODEL="deepseek-ai/DeepSeek-V4-Pro"
```

2. Install, migrate, seed, dan jalankan:

```bash
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```

3. Buka di browser:
   - **User App** → `http://localhost:5173`
   - **Admin Panel** → `http://localhost:5174` (login: `admin` / `Password123!`)
   - **Backend API** → `http://localhost:3000`

## Endpoint API

| Method | Path | Fungsi |
|--------|------|--------|
| `GET` | `/agent/menu?userId=...` | Menu filtered by preferences |
| `GET` | `/agent/personas` | Daftar persona |
| `GET` | `/agent/preferences?userId=...` | Baca preferensi user |
| `POST` | `/agent/preferences` | Simpan preferensi user |
| `GET` | `/agent/menus` | Semua menu (admin) |
| `POST` | `/agent/menu` | Tambah menu + jadwalkan AI analysis |
| `PUT` | `/agent/menu/:id` | Update menu |
| `DELETE` | `/agent/menu/:id` | Hapus menu |
| `POST` | `/agent/analyze` | Trigger AI analysis |
| `GET` | `/agent/analysis/stream` | SSE stream analysis progress |

## Persona

| Persona | Alergi | ID |
|---------|--------|----|
| Andi 👨‍🍳 | Tidak ada | `persona-andi` |
| Budi 🥜 | Kacang, Seafood | `persona-budi` |
| Dedi 💪 | Telur | `persona-dedi` |

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Framework** | NestJS 11 |
| **Agent SDK** | Google ADK 1.3 |
| **LLM Provider** | Nebius AI (DeepSeek V4 Pro) |
| **Database** | Supabase PostgreSQL + Prisma 7 |
| **Queue** | Bull MQ + Upstash Redis |
| **Search** | Exa API |
| **Frontend User** | React 19 + Vite 7 |
| **Frontend Admin** | React 19 + Vite 7 |
| **Auth** | Built-in (admin/Password123!) |

## Skripsi

Dokumen pendukung:
- `docs/MATCH_SCORE_METHOD.md` — metode multi-criteria weighted scoring
- `docs/RESEARCH_CATALOG.md` — detail katalog 36 menu riset

## Catatan

Data medis dan hasil deteksi pada purwarupa ini adalah **bantuan keputusan penelitian**, bukan diagnosis atau jaminan bebas alergi.
