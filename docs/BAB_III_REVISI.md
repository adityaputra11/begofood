# BAB III
# METODE PENELITIAN

## 3.1 Tahapan Penelitian

Penelitian ini menggunakan pendekatan **User-Centered Design (UCD)** yang mengacu pada standar ISO 9241-210 mengenai ergonomi interaksi manusia-sistem. Tahapan penelitian dibagi menjadi empat siklus iteratif utama:

1. **Memahami Konteks Pengguna (*Understand Context of Use*)** : Melakukan identifikasi terhadap batasan medis pengguna (riwayat alergi), preferensi sensoris, serta preferensi cita rasa dalam konteks pemesanan makanan digital. Tahap ini menghasilkan pemetaan persona dan kebutuhan awal sistem.

2. **Menentukan Kebutuhan Pengguna (*Specify User Requirements*)** : Menerjemahkan hasil analisis konteks menjadi spesifikasi kebutuhan fungsional agen kecerdasan buatan dan kebutuhan antarmuka. Tahap ini menghasilkan *user story* dan kebutuhan non-fungsional.

3. **Menghasilkan Solusi Desain (*Produce Design Solutions*)** : Melakukan perancangan arsitektur *Multi-Agent System* (MAS), perancangan *matching engine*, dan pengembangan purwarupa (*prototype*) aplikasi web yang interaktif. Solusi desain mencakup backend (NestJS + Google ADK), frontend pengguna (React), dan panel admin (React).

4. **Mengevaluasi Desain (*Evaluate Designs*)** : Melakukan pengujian sistem terhadap skenario pengguna untuk mengukur tingkat akurasi penalaran agen, ketepatan deteksi alergen, serta evaluasi *User Experience* (UX) melalui skenario terstruktur.

## 3.2 Metode Pengumpulan Data

Data yang digunakan untuk mendukung perancangan dan pengujian sistem pada penelitian ini dikumpulkan melalui metode berikut:

**Studi Literatur**: Pengumpulan referensi dari jurnal ilmiah terkait *Agentic AI*, *Tool-Augmented Generation* (TAG), *multi-criteria recommendation systems*, serta standar manajemen risiko alergen dalam industri pangan.

**Observasi Platform**: Peninjauan terhadap katalog menu restoran dari delapan merek restoran di Indonesia (Sate Khas Senayan, HOLYCOW!, Pizza Marzano Indonesia, Bakmi GM, Ta Wan, Imperial Kitchen & Dimsum, Bandar Djakarta, D'Cost Seafood, dan Cinnamon Mandarin Oriental Jakarta) untuk memetakan variasi menu dan celah keamanan informasi (ketiadaan filter alergi otomatis).

**Penyusunan Basis Data Simulasi**: Penyusunan basis data internal yang mencakup 36 variasi menu dari tiga klaster kuliner (Western-Indonesia, Chinese Food, Seafood) lengkap dengan komposisi bahan baku utama, bahan tersembunyi (*hidden ingredients*), profil sensoris, dan alergen sebagai dasar pengujian agen.

## 3.3 Analisis Kebutuhan Sistem

Spesifikasi kebutuhan sistem pada penelitian ini disusun menggunakan pendekatan *Agile* melalui format *User Story* untuk memastikan setiap fungsionalitas memiliki nilai manfaat yang jelas bagi pengguna akhir.

### 3.3.1 Pemodelan Persona (*User Persona*)

Persona digunakan untuk merepresentasikan segmentasi target pengguna berdasarkan batasan klinis dan preferensi psikologis. Terdapat tiga persona utama yang dirancang dalam pengembangan sistem ini:

**Persona 1: Pengguna Tanpa Risiko Medis (Andi)**

| Atribut | Deskripsi |
|---------|-----------|
| ID | `persona-andi` |
| Karakteristik | Tidak memiliki riwayat alergi makanan. Fokus pada preferensi cita rasa dan pengalaman memilih menu. |
| Tujuan (*Goals*) | Mendapatkan rekomendasi menu yang sesuai dengan preferensi cita rasa sesaat. |
| Titik Masalah (*Pain Points*) | Katalog menu yang banyak tanpa personalisasi membuat proses pemilihan tidak efisien. |

**Persona 2: Pengguna dengan Alergi Ganda (Budi)**

| Atribut | Deskripsi |
|---------|-----------|
| ID | `persona-budi` |
| Karakteristik | Memiliki alergi terhadap kacang dan seafood. Membutuhkan kepastian bahwa menu yang dipilih aman dikonsumsi. |
| Tujuan (*Goals*) | Menyaring menu berdasarkan alergi secara otomatis tanpa harus membaca komposisi satu per satu. |
| Titik Masalah (*Pain Points*) | Platform pemesanan konvensional tidak memiliki filter alergi otomatis dan akurat. |

**Persona 3: Pengguna dengan Alergi Tunggal (Dedi)**

| Atribut | Deskripsi |
|---------|-----------|
| ID | `persona-dedi` |
| Karakteristik | Alergi terhadap telur. Memiliki preferensi cita rasa spesifik. |
| Tujuan (*Goals*) | Mendapatkan rekomendasi menu yang aman sekaligus sesuai dengan preferensi cita rasa. |
| Titik Masalah (*Pain Points*) | Filter keamanan dan preferensi cita rasa tidak terintegrasi dalam satu platform. |

Tabel 3.1 — Ringkasan ketiga persona pengguna

| Persona | Alergi | Fokus | ID Pengguna |
|---------|--------|-------|-------------|
| Andi | Tidak ada | Preferensi rasa | `persona-andi` |
| Budi | Kacang, Seafood | Keamanan medis | `persona-budi` |
| Dedi | Telur | Keamanan + preferensi | `persona-dedi` |

### 3.3.2 Kebutuhan Fungsional Berbasis *User Story*

Kebutuhan fungsional sistem diturunkan dari persona di atas menggunakan pendekatan *Agile* berupa *User Story* agar setiap fitur memiliki nilai penyelesaian masalah yang jelas.

**A. Fungsi Validasi Keamanan Medis (Berdasarkan Persona 2 dan 3)**

- **US-01**: Sebagai pengguna dengan risiko medis, saya ingin memilih persona yang sesuai dengan profil alergi saya, sehingga sistem secara otomatis mengetahui batasan klinis saya.
- **US-02**: Sebagai pengguna dengan risiko medis, saya ingin sistem menyaring menu yang mengandung alergen saya dan menampilkan peringatan visual, sehingga saya terhindar dari risiko pemesanan yang berbahaya.
- **US-03**: Sebagai pengguna dengan risiko medis, saya ingin melihat penjelasan mengapa suatu menu tidak aman (alergen terdeteksi, bahan tersembunyi, risiko kontaminasi silang), sehingga saya memahami dasar keputusan sistem.

**B. Fungsi Personalisasi Psikologis (Berdasarkan Persona 1 dan 3)**

- **US-04**: Sebagai pengguna, saya ingin memilih preferensi cita rasa (pedas, manis, asam, atau gurih), sehingga sistem memberikan skor kecocokan yang lebih tinggi pada menu yang sesuai.
- **US-04A**: Sebagai pengguna, saya ingin memilih preferensi sensoris (renyah, lembut, hangat, atau aromatik), sehingga sistem dapat menilai kecocokan karakter menu secara terpisah dari cita rasa.
- **US-05**: Sebagai pengguna, saya ingin menu direkomendasikan secara adaptif tanpa perlu memuat ulang halaman saat preferensi cita rasa saya berubah.

**C. Fungsi Interaksi Antarmuka Adaptif (*Agentic UI*)**

- **US-06**: Sebagai pengguna, saya ingin melihat tata letak rekomendasi menu beradaptasi secara dinamis sesuai interaksi saya, sehingga saya tidak perlu memuat ulang halaman.
- **US-07**: Sebagai pengguna, saya ingin sistem menyajikan penjelasan rasional mengapa suatu menu direkomendasikan atau tidak aman untuk saya, sehingga saya merasa aman dan percaya terhadap rekomendasi agen cerdas.

**D. Fungsi Panel Admin**

- **US-08**: Sebagai admin, saya ingin menambah menu baru dengan informasi dasar (nama, deskripsi, restoran) dan sistem secara otomatis menganalisis komposisi serta alergen melalui AI.
- **US-09**: Sebagai admin, saya ingin melihat progres analisis AI secara *real-time* dan mendapatkan notifikasi saat analisis selesai.

### 3.3.3 Kebutuhan Non-Fungsional

**Kinerja dan Konkurensi**: Proses analisis AI yang memakan waktu 3-6 detik harus ditangani secara asinkron melalui antrean pesan (*message queue*) agar tidak memblokir respons API. Latency pengambilan menu yang sudah terfilter harus di bawah 500ms.

**Ketersediaan (*Availability*)** : Purwarupa perangkat lunak berbasis web harus dapat diakses secara stabil dan interaktif melalui peramban web standar serta responsif terhadap perangkat bergerak (*mobile*).

**Keamanan**: Panel admin harus dilindungi dengan autentikasi sederhana. Data preferensi pengguna disimpan di database dan tidak dapat diakses antar pengguna.

## 3.4 Perancangan Arsitektur Sistem (*Produce Design Solutions*)

### 3.4.1 Arsitektur Multi-Agent

Sistem rekomendasi ini dibangun menggunakan **Google Agent Development Kit (ADK)** versi 1.3 dengan arsitektur multi-agent yang memisahkan beban kerja ke dalam beberapa agen otonom. Terdapat dua kategori agen: agen berbasis ADK (menggunakan *Large Language Model*) dan komponen deterministik backend.

#### A. Agen Berbasis ADK (*Google Agent Development Kit*)

**1. Knowledge Agent**

Bertanggung jawab menganalisis menu makanan menggunakan *Large Language Model* (**DeepSeek V4 Pro**) melalui penyedia Nebius AI. Agen ini berjalan secara asinkron melalui antrean Bull MQ. Saat admin menambahkan menu baru, Knowledge Agent menerima nama dan deskripsi menu, mencari informasi pendukung melalui **Exa Search Engine**, dan menghasilkan data terstruktur berupa:

- Deskripsi menu yang kaya dan informatif
- Komposisi bahan-bahan utama (*ingredients*)
- Alergen yang mungkin terkandung (dari: kacang, susu, telur, seafood)
- Tag cita rasa (spicy, savory, sweet, sour)
- Profil sensoris (renyah, lembut, hangat, aromatik)
- Estimasi kalori per porsi

Output agen ini divalidasi menggunakan **Zod schema** untuk memastikan struktur data konsisten. Alergen yang terdeteksi oleh LLM kemudian diverifikasi ulang oleh fungsi `validateAllergens()` yang mencocokkan bahan dengan aturan berbasis aturan (*rule-based*) untuk mengurangi *false positive* — misalnya santan/kelapa tidak boleh dideteksi sebagai alergen susu.

**2. Culinary Assistant Agent**

Agen chat interaktif yang menggunakan pola hierarkis dengan tiga sub-agen. Agen ini dijalankan menggunakan *Runner* dari ADK yang mengelola sesi percakapan:

- **Menu Recommender Agent**: Membantu pengguna mencari dan merekomendasikan menu. Dilengkapi tools: filter menu, baca preferensi, dan pencarian Exa.
- **Recipe Agent**: Memberikan informasi resep dan cara memasak. Dilengkapi tool pencarian Exa.
- **Nutrition Agent**: Memberikan informasi nutrisi dan gizi. Dilengkapi tools baca/simpan preferensi dan pencarian Exa.

Agen chat ini tidak menjadi fokus utama pengujian dalam penelitian ini — fokus utama adalah pada sistem filtering alergi dan skoring kecocokan menu yang bekerja di luar agen chat.

#### B. Komponen Filtering dan Skoring (Deterministik)

**3. Medical Filter**

Komponen pada backend (`agent.service.ts`) yang melakukan penyaringan menu berdasarkan data alergi pengguna. Bekerja secara **deterministik** — mencocokkan daftar alergen pada profil pengguna dengan *field* `allergens` pada setiap item menu menggunakan query Prisma `hasSome`. Implementasi:

- Menu yang mengandung alergen pengguna → diklasifikasikan sebagai `unsafe` dengan skor 0
- Menu yang aman → diklasifikasikan sebagai `safe`
- Filter dieksekusi sebagai dua query Prisma paralel: satu untuk menu aman (dengan klausa `NOT: { allergens: { hasSome: allergies } }`) dan satu untuk menu tidak aman

**4. *Psychological Scorer***

Komponen pada backend yang menghitung skor kecocokan (*match score*) berdasarkan dua variabel personalisasi yang terpisah, yaitu kesesuaian karakter sensoris menu dengan preferensi sensoris pengguna dan kesesuaian tag cita rasa menu dengan preferensi cita rasa pengguna.

Hubungan antar komponen digambarkan sebagai berikut:

```
                        ┌──────────────────────┐
                        │   Panel Admin         │
                        │ Tambah Menu Baru      │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │   Knowledge Agent     │
                        │ (ADK + Exa + DeepSeek)│
                        │   Async via Bull MQ   │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │     Database          │
                        │  (Supabase PostgreSQL)│
                        └──────────┬───────────┘
                                   │
             ┌─────────────────────┼─────────────────────┐
             │                     │                     │
             ▼                     ▼                     ▼
   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
   │  Pilih Persona   │   │  Medical Filter  │   │Psychological    │
   │  (Andi/Budi/Dedi)│──▶│ (deterministik)  │──▶│ Scorer          │
   └─────────────────┘   │ hasSome query    │   │ (weighted       │
                         │ → safe / unsafe  │   │  scoring)       │
                         └─────────────────┘   └────────┬────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │ Response API    │
                                               │ {safe, unsafe}  │
                                               │ sorted by score │
                                               └─────────────────┘
```

Ketiga komponen (Knowledge Agent, Medical Filter, Psychological Scorer) bekerja secara independen dengan tanggung jawab yang terpisah. Knowledge Agent bekerja secara asinkron melalui antrean, sedangkan Medical Filter dan Psychological Scorer bekerja secara sinkron saat pengguna meminta daftar menu.

### 3.4.2 Arsitektur Backend

Backend dikembangkan menggunakan **NestJS 11** dengan komponen utama:

- **Google ADK 1.3**: *Framework* agen untuk *knowledge agent* (dengan *output schema* terstruktur) dan *culinary assistant* (dengan multi-agent chat)
- **Bull MQ + Upstash Redis**: Antrean pesan untuk pemrosesan analisis menu secara asinkron oleh Knowledge Agent. Eksekusi dibatasi maksimal 1 job per 8 detik untuk menghindari *rate limiting*
- **Prisma 7 + Supabase PostgreSQL**: ORM dan database untuk penyimpanan data menu, pengguna, dan preferensi
- **Server-Sent Events (SSE)**: Mekanisme notifikasi *real-time* untuk memperbarui status analisis menu pada panel admin
- **DeepSeek V4 Pro (via Nebius AI)**: LLM yang digunakan oleh Knowledge Agent untuk analisis menu
- **Exa Search Engine**: *Tool* pencarian web yang digunakan Knowledge Agent untuk mencari referensi resep dan komposisi bahan

Alur pemrosesan permintaan pengguna:

1. **Inisialisasi Profil**: Pengguna memilih persona (Andi/Budi/Dedi) → preferensi alergi dan rasa dikirim ke backend dan disimpan di database
2. **Filtering + Scoring**: Pengguna membuka halaman menu → backend membaca preferensi user → Medical Filter mengeksekusi query Prisma untuk memisahkan menu safe/unsafe → Psychological Scorer menghitung *match score* pada setiap menu safe → daftar menu dikembalikan dalam format `{ safe: [...], unsafe: [...] }`
3. **Analisis Asinkron**: Admin menambah menu baru → menu disimpan dengan data minimal → Knowledge Agent dijadwalkan melalui Bull MQ → hasil analisis diperbarui ke database → SSE mengirim notifikasi ke panel admin

### 3.4.3 Multi-Criteria Weighted Scoring — Metode dan Keterbatasan

Skor kecocokan menu dihitung menggunakan metode **multi-criteria weighted scoring** dengan formula:

```
Score = Safety Base (60) + Sensory Match (0 atau 20) + Taste Match (0 atau 20)
```

Tabel 3.2 — Komponen *Multi-Criteria Weighted Scoring*

| Komponen | Bobot | Implementasi |
|----------|-------|-------------|
| Safety Base | 60 (*hard constraint*) | Jika menu mengandung alergen user → return 0. Jika aman → +60 |
| Sensory Match | 0 atau 20 | Nilai 20 jika profil sensoris menu sesuai preferensi pengguna |
| Taste Match | 0 atau 20 | Nilai 20 jika tag cita rasa menu sesuai preferensi pengguna |

**Peringatan Metodologis:**

Nilai bobot yang digunakan dalam formula di atas (60 dan 40) merupakan **nilai heuristik (hasil rancangan)** yang ditentukan berdasarkan pertimbangan rasional pengembang, bukan hasil kutipan langsung dari satu referensi akademik tertentu. Nilai-nilai ini dipilih dengan dasar:

1. **Safety base 60**: Agar keamanan alergi menjadi komponen dominan setelah menu lolos *hard constraint*.
2. **Sensory match 20**: Mengukur kecocokan renyah, lembut, hangat, atau aromatik.
3. **Taste match 20**: Mengukur kecocokan pedas, manis, asam, atau gurih.
4. **Total maksimum 100** (60 + 20 + 20).

Kerangka kerja *multi-criteria scoring* secara konseptual merujuk pada pendekatan *multi-criteria decision making* yang umum dalam sistem rekomendasi, namun penetapan bobot spesifik merupakan hasil eksperimen dan *tuning* pengembang. Batasan ini dicatat sebagai salah satu keterbatasan penelitian dan direkomendasikan untuk divalidasi lebih lanjut menggunakan metode seperti **AHP (Analytic Hierarchy Process)** atau ***conjoint analysis*** pada penelitian selanjutnya.

Tabel 3.3 — Rentang skor kecocokan

| Skenario | Perhitungan | Score | Kategori |
|----------|-------------|-------|----------|
| Mengandung alergen user | — | 0 | *Unsafe* |
| Aman, tanpa kecocokan | 60 + 0 + 0 | 60 | *Safe* |
| Aman + satu dimensi cocok | 60 + 20 + 0 | 80 | *Safe* |
| Aman + sensoris dan cita rasa cocok | 60 + 20 + 20 | 100 | *Safe* |

### 3.4.4 Penanganan Alergen dan Validasi

Sistem menggunakan pendekatan **hybrid** untuk deteksi alergen:

1. **Deteksi oleh Knowledge Agent (AI)**: LLM menganalisis nama dan deskripsi menu untuk mendeteksi alergen potensial berdasarkan data dari web.
2. **Validasi *Rule-Based***: Setelah LLM menghasilkan daftar alergen, fungsi `validateAllergens()` melakukan validasi tambahan dengan mencocokkan bahan-bahan terhadap aturan berbasis aturan. Contoh:
   - Santan/kelapa → BUKAN alergen susu (*false positive prevention*)
   - Kecap/tahu/tempe → kedelai
   - Tepung terigu/mie/roti → gluten
3. **Filter Empat Alergen Utama**: Sistem hanya menyimpan dan menggunakan empat alergen yang menjadi batasan penelitian, yaitu **kacang, susu, telur, dan seafood**. Nilai alergen di luar empat kategori tersebut dikeluarkan pada proses validasi dan normalisasi data.

### 3.4.5 Arsitektur Frontend dan Admin

**Frontend Pengguna** (React 19 + Vite 7):
- Halaman pemilihan persona sebagai pintu masuk utama
- Halaman utama dengan daftar menu yang sudah difilter dan diurutkan berdasarkan *match score*
- Menu tidak aman (*unsafe*) ditampilkan di bagian terpisah dengan *badge* peringatan dan tombol "Lihat detail" dikunci (*disabled*)
- Setiap menu aman menampilkan persentase kecocokan (*match score*) dan penjelasan rekomendasi
- Modal preferensi untuk mengubah alergi, preferensi sensoris (renyah, lembut, hangat, aromatik), dan preferensi cita rasa (pedas, manis, asam, gurih)
- Panel detail menu yang menampilkan komposisi, alergen, profil sensoris, dan penjelasan keamanan
- Navigasi responsif untuk perangkat *mobile*

**Panel Admin** (React 19 + Vite 7):
- Autentikasi sederhana (*username*: admin, *password*: Password123!)
- Tabel daftar menu dengan informasi status analisis
- Formulir tambah menu (pop-up modal) dengan input: nama, deskripsi, restoran
- Status analisis: menunggu → diproses → selesai
- Notifikasi *real-time* dari *Server-Sent Events* saat analisis selesai

### 3.4.6 Arsitektur Jaringan (*Deployment*)

Sistem di-*deploy* pada server Ubuntu (Tencent Cloud) dengan komposisi:

- **Caddy**: *Reverse proxy* dan SSL *termination* (Let's Encrypt otomatis)
- **PM2**: *Process manager* untuk backend Node.js
- **Cloudflare**: DNS *management*
- **Database**: Supabase PostgreSQL (PostgreSQL 15, *session-mode pooler*)
- **Redis**: Upstash (Redis 7, *cloud*)
- **Domain**: `begofood.my.id` (pengguna), `admin.begofood.my.id` (admin), `api.begofood.my.id` (API)

## 3.5 Perancangan Antarmuka (*User Interface Design*)

Tahap perancangan antarmuka bertujuan untuk menerjemahkan spesifikasi kebutuhan dan fungsionalitas agen *backend* ke dalam bentuk purwarupa (*prototype*) visual berbasis aplikasi web. Perancangan ini secara khusus mengimplementasikan paradigma ***Agentic UI***, di mana elemen-elemen antarmuka beradaptasi secara proaktif berdasarkan hasil penalaran agen kecerdasan buatan.

### 3.5.1 Alur Interaksi Pengguna (*User Flow*)

Alur interaksi dirancang seringkas mungkin untuk memastikan kemudahan penggunaan (*usability*). Tahapan interaksi meliputi:

1. **Inisialisasi Profil**: Pengguna memilih salah satu dari tiga persona yang tersedia (Andi, Budi, Dedi). Setiap persona memiliki konfigurasi alergi bawaan. Pengguna juga dapat memilih profil "Siapa yang pakai?" untuk pengalaman yang lebih personal.

2. **Eksplorasi Menu**: Sistem menampilkan daftar menu yang telah difilter berdasarkan alergi persona yang dipilih. Menu ditampilkan dalam dua bagian terpisah:
   - **Menu Aman**: Daftar menu yang aman dikonsumsi, diurutkan berdasarkan *match score* (tertinggi ke terendah)
   - **Menu Tidak Aman**: Daftar menu yang mengandung alergen, ditandai dengan *badge* "⚠ Tidak aman" dan tombol detail dikunci (*disabled*). Setiap item menampilkan alasan spesifik (alergen terdeteksi, bahan tersembunyi, risiko kontaminasi silang)

3. **Kustomisasi Preferensi**: Pengguna dapat membuka modal preferensi untuk:
   - Mengubah alergi (empat opsi: kacang, susu, telur, seafood)
   - Memilih preferensi sensoris (renyah, lembut, hangat, atau aromatik)
   - Memilih preferensi cita rasa (pedas, manis, asam, atau gurih)
   - Perubahan diterapkan secara *real-time* tanpa *reload* halaman

4. **Pencarian dan Filter**: Pengguna dapat mencari menu berdasarkan nama dan menyaring berdasarkan kategori.

5. **Pergantian Persona**: Pengguna dapat kembali ke halaman pemilihan persona untuk menggunakan profil yang berbeda.

### 3.5.2 Implementasi *Agentic UI* pada Antarmuka

Karakteristik *Agentic UI* yang diterapkan pada antarmuka meliputi:

**Tindakan Preventif Visual (*Visual Preventive Action*)** :
Sistem antarmuka secara otomatis mengunci elemen interaktif (*disabled button*) pada tombol pemesanan untuk hidangan yang terdeteksi memiliki bahan penyebab alergi pengguna. Menu yang berbahaya akan disorot menggunakan *badge* peringatan "⚠ Tidak aman" dan diberikan latar belakang redup.

**Adaptasi Tata Letak Dinamis (*Dynamic Layout Adaptation*)** :
Antarmuka tidak memerlukan pemuatan ulang halaman saat agen *backend* melakukan pembaruan rekomendasi. Daftar makanan akan berubah susunannya secara *real-time* seiring dengan perubahan preferensi yang diinputkan oleh pengguna.

**Skor Kecocokan dan Penjelasan Rasional**:
Setiap menu aman menampilkan persentase kecocokan (*match score* dalam bentuk label angka) dan penjelasan singkat mengapa menu tersebut direkomendasikan. Menu tidak aman menampilkan alasan spesifik seperti "Terdeteksi kacang" atau "Bahan tersembunyi: kacang tanah".

**Personalisasi Diksi Sensoris**:
Area deskripsi teks pada setiap kartu menu menampilkan hasil analisis Knowledge Agent yang menonjolkan aspek sensoris (seperti tekstur, aroma, cita rasa) untuk meningkatkan relevansi psikologis dan minat pengguna terhadap hidangan yang tervalidasi aman.

**Responsif**:
Antarmuka dapat digunakan pada perangkat *desktop* dan *mobile* dengan navigasi yang menyesuaikan secara otomatis.

### 3.5.3 Batasan Antarmuka

- **Alergi**: Hanya empat alergi yang didukung (kacang, susu, telur, seafood) sesuai batasan penelitian
- **Preferensi Cita Rasa**: Empat opsi yang didukung dataset, yaitu pedas, manis, asam, dan gurih
- **Ruang lingkup profil**: Sistem menyimpan tiga kelompok data yang dibatasi pada empat alergi (kacang, susu, telur, seafood), empat sensoris (renyah, lembut, hangat, aromatik), dan empat cita rasa (pedas, manis, asam, gurih)
- **Chat AI**: Tombol chat AI disembunyikan dari antarmuka utama karena tidak menjadi fokus penelitian
- **Pencarian**: Pencarian berbasis teks pada nama menu

## 3.6 Skenario Pengujian (*Evaluate Designs*)

Pengujian sistem dilakukan dengan tiga skenario utama yang mencakup seluruh kebutuhan fungsional:

**Skenario 1: Pengguna dengan Alergi Ganda (Budi)**
1. Pengguna memilih persona Budi (alergi kacang & seafood)
2. Sistem menampilkan daftar menu yang aman (tanpa kacang & seafood) serta menu tidak aman (mengandung kacang dan/atau seafood)
3. Menu tidak aman ditandai dengan *badge* peringatan dan alasan spesifik
4. Validasi: menu berbasis kacang (Sate Ayam) dan seafood (Udang Bakar) masuk kategori *unsafe*

**Skenario 2: Pengguna dengan Alergi Tunggal (Dedi)**
1. Pengguna memilih persona Dedi (alergi telur)
2. Sistem menampilkan menu aman (tanpa telur) dan menu tidak aman (mengandung telur)
3. Validasi: menu dengan bahan telur masuk kategori *unsafe*

**Skenario 3: Pengguna Tanpa Alergi (Andi)**
1. Pengguna memilih persona Andi (tanpa alergi)
2. Semua menu ditampilkan dalam kategori aman
3. Urutan menu dipengaruhi oleh *match score* berdasarkan preferensi sensoris dan cita rasa yang dipilih

Setiap skenario mengukur:
- **Akurasi deteksi alergen** — apakah sistem berhasil mengidentifikasi menu yang mengandung alergen sesuai *ground truth* dataset
- **Waktu pemrosesan** — *latency* dari request hingga response
- **Fungsionalitas antarmuka** — peringatan visual, tombol *disabled*, adaptasi *real-time*

## 3.7 Metode Pembahasan Hasil Analisis

Langkah selanjutnya dari hasil penelitian dan pembahasan adalah menginterpretasikan dan membahas hasil penelitian dengan langkah-langkah sebagai berikut:

1. **Pemaparan hasil penelitian** pada dasarnya adalah konsep penyelesaian masalah yang diuraikan secara sistematis. Setiap temuan disajikan dalam bentuk deskripsi teknis yang didukung oleh data kuantitatif maupun kualitatif.

2. **Penyajian paparan hasil** disusun secara berurutan sejalan dengan urutan rumusan masalah penelitian yang telah ditetapkan. Urutan penyajian dimulai dari implementasi sistem, hasil pengujian skenario, akurasi deteksi alergen, analisis waktu pemrosesan, hingga evaluasi pengalaman pengguna.

3. **Paparan hasil analisis** disajikan dalam bentuk tabel, grafik, dan diagram untuk memudahkan interpretasi. Setiap hasil analisis dikelompokkan menjadi tiga kondisi pokok:

   a. **Hasil penelitian positif**, yaitu temuan yang sesuai dengan harapan dan hipotesis penelitian. Contoh: akurasi Medical Filter mencapai 100%, waktu pemrosesan di bawah 200ms, dan seluruh skenario pengujian berjalan sesuai rancangan.

   b. **Hasil penelitian negatif**, yaitu temuan yang tidak sesuai harapan atau menunjukkan keterbatasan sistem. Contoh: bobot *multi-criteria weighted scoring* masih bersifat heuristik tanpa validasi pembobotan formal dan Knowledge Agent gagal mem-*parse* output pada beberapa kasus.

   c. **Hasil penelitian yang memerlukan penelitian lanjutan**, yaitu temuan yang membuka peluang pengembangan lebih lanjut. Contoh: validasi bobot menggunakan AHP (*Analytic Hierarchy Process*), pengujian dengan dataset yang lebih besar dan beragam, serta evaluasi *usability* formal menggunakan *System Usability Scale* (SUS) dengan responden nyata.

Pembahasan hasil analisis akan menghubungkan setiap temuan dengan teori yang telah diuraikan pada Bab II, serta membandingkannya dengan penelitian terdahulu untuk menunjukkan posisi dan kontribusi penelitian ini.
