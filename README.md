# Begofood AI

Purwarupa skripsi sistem rekomendasi menu berbasis multi-agent Google ADK, NestJS, Prisma/PostgreSQL, dan React Vite. Sistem memadukan batasan alergi, pola diet, dan preferensi sensoris untuk menyaring serta menjelaskan rekomendasi menu.

## Fitur utama

- katalog riset 36 menu dari tiga klaster restoran;
- profil alergi dan diet yang persisten;
- penyaringan menu deterministik sebelum respons LLM;
- metadata bahan tersembunyi dan risiko kontaminasi silang;
- scoring kecocokan karakter sensoris;
- UI responsif desktop/mobile dengan preventive action;
- menu berisiko ditandai, dijelaskan, dan tombolnya dikunci;
- chat multi-agent untuk rekomendasi, resep, dan informasi nutrisi;
- metadata latency pada respons katalog untuk kebutuhan evaluasi.

Detail metodologi dataset ada di [docs/RESEARCH_CATALOG.md](docs/RESEARCH_CATALOG.md).

## Struktur monorepo

```text
apps/
├── backend/   # NestJS, Google ADK, Prisma, PostgreSQL, Redis
└── frontend/  # React, Vite, responsive web UI
```

Dependency dikelola dari root dengan pnpm workspace. Setiap aplikasi tetap memiliki `package.json` dan lifecycle sendiri.

## Menjalankan lokal

Kebutuhan: Node.js 20+, pnpm, PostgreSQL, dan Redis. Salin `apps/backend/.env.example` menjadi `apps/backend/.env`, lalu isi kredensial database dan provider LLM.

```bash
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev
```

Perintah `pnpm dev` menjalankan backend dan frontend bersamaan. Untuk menjalankan secara terpisah:

```bash
pnpm dev:backend
pnpm dev:frontend
```

Backend berjalan di `http://localhost:3000` dan frontend di `http://localhost:5173`.

## Endpoint penting

| Method | Path                            | Fungsi                                                    |
| ------ | ------------------------------- | --------------------------------------------------------- |
| `GET`  | `/agent/menu?userId=...`        | Rekomendasi aman, menu berisiko, explanation, dan latency |
| `GET`  | `/agent/preferences?userId=...` | Membaca profil alergi/diet                                |
| `POST` | `/agent/preferences`            | Menyimpan profil alergi/diet                              |
| `POST` | `/agent/chat`                   | Percakapan dengan orchestrator ADK                        |
| `POST` | `/agent/menu`                   | Menambah menu dan menjadwalkan analisis knowledge agent   |

Filter katalog yang didukung: `search`, `category`, `cluster`, dan `sensory` (dipisahkan koma).

## Verifikasi

```bash
pnpm build
pnpm test
```

Data medis dan hasil deteksi pada purwarupa ini adalah bantuan keputusan penelitian, bukan diagnosis atau jaminan bebas alergi.
