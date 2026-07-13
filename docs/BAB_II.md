# BAB II
# LANDASAN TEORI

## 2.1 Kecerdasan Buatan dalam Sistem Rekomendasi

### 2.1.1 Sistem Rekomendasi

Sistem rekomendasi adalah subkelas dari sistem penyaring informasi yang bertujuan memprediksi peringkat atau preferensi yang akan diberikan pengguna terhadap suatu item (Resnick & Varian, 1997). Secara umum, sistem rekomendasi diklasifikasikan menjadi tiga pendekatan utama:

1. ***Collaborative Filtering***: Memberikan rekomendasi berdasarkan preferensi pengguna lain yang memiliki kemiripan pola. Pendekatan ini membutuhkan data interaksi pengguna dalam jumlah besar.

2. ***Content-Based Filtering***: Memberikan rekomendasi berdasarkan kemiripan atribut item dengan preferensi pengguna. Setiap item direpresentasikan oleh *feature vector* yang kemudian dibandingkan dengan profil pengguna.

3. ***Hybrid***: Menggabungkan kedua pendekatan di atas untuk mengatasi kelemahan masing-masing.

Penelitian ini menggunakan pendekatan ***content-based filtering*** di mana item menu direpresentasikan oleh atribut terstruktur berupa bahan, alergen, karakter sensoris, dan tag cita rasa. Atribut tersebut dicocokkan dengan profil alergi, preferensi sensoris, serta preferensi cita rasa pengguna. Dalam batas penelitian, sensoris terdiri atas renyah, lembut, hangat, dan aromatik, sedangkan cita rasa terdiri atas pedas, manis, asam, dan gurih.

### 2.1.2 *Large Language Model* (LLM)

*Large Language Model* adalah model bahasa berbasis *deep learning* yang dilatih pada korpus teks dalam jumlah sangat besar. Model ini mampu memahami, merangkum, dan menghasilkan teks yang koheren melalui mekanisme *transformer* (Vaswani et al., 2017). LLM modern seperti GPT-4, Claude, dan DeepSeek menunjukkan kemampuan *few-shot learning* dan *reasoning* yang melampaui model sebelumnya (Brown et al., 2020).

Dalam penelitian ini, **DeepSeek V4 Pro** digunakan sebagai LLM yang mendukung *Knowledge Agent*. Model ini diakses melalui penyedia Nebius AI menggunakan API yang kompatibel dengan format OpenAI.

### 2.1.3 *Tool-Augmented Generation* (TAG)

*Tool-Augmented Generation* (TAG) adalah paradigma di mana LLM tidak hanya mengandalkan pengetahuan internalnya, tetapi juga diberikan akses ke *tool* eksternal seperti *search engine*, kalkulator, atau API database (Schick et al., 2023). TAG mengatasi keterbatasan LLM murni yang memiliki *knowledge cutoff* dan tidak dapat mengakses data real-time.

Dalam arsitektur TAG, LLM bertindak sebagai *reasoning engine* yang:
1. Menerima *query* pengguna
2. Menentukan *tool* mana yang perlu dipanggil
3. Memproses hasil *tool* dan menghasilkan respons akhir

Penelitian ini mengimplementasikan TAG melalui Google ADK di mana *Knowledge Agent* memiliki akses ke **Exa Search Engine** untuk mencari informasi resep dan komposisi bahan dari web.

## 2.2 *Multi-Agent System* (MAS)

### 2.2.1 Definisi dan Karakteristik

*Multi-Agent System* (MAS) adalah sistem yang terdiri dari beberapa agen cerdas yang berinteraksi dalam satu lingkungan untuk mencapai tujuan bersama atau tujuan individual (Wooldridge, 2009). Karakteristik utama MAS meliputi:

- **Otonomi**: Setiap agen beroperasi secara independen tanpa campur tangan langsung manusia
- **Lokalitas**: Setiap agen hanya memiliki informasi terbatas atau kemampuan terbatas
- **Desentralisasi**: Tidak ada agen tunggal yang mengendalikan seluruh sistem
- **Kolaborasi**: Agen dapat berkomunikasi dan berkoordinasi untuk mencapai tujuan bersama

Dalam konteks sistem rekomendasi makanan, MAS memungkinkan pemisahan tanggung jawab antara agen yang menangani aspek keamanan medis (deteksi alergen) dan agen yang menangani aspek personalisasi (preferensi sensoris dan cita rasa).

### 2.2.2 *Google Agent Development Kit* (ADK)

Google ADK adalah *framework* untuk membangun dan mengelola agen AI yang dapat menggunakan *tool* eksternal, mengakses data real-time, dan berinteraksi dengan pengguna melalui berbagai saluran. ADK menyediakan:

- **Agent**: Unit dasar yang memiliki instruksi, model, dan *tool*
- **Runner**: Runtime yang mengeksekusi agen dan mengelola siklus hidup percakapan
- **Tool**: Fungsi eksternal yang dapat dipanggil agen (FunctionTool, AgentTool)
- **Session Service**: Mengelola state percakapan per sesi pengguna
- **Output Schema**: Skema terstruktur (Zod) untuk memvalidasi output agen

Arsitektur ADK mendukung pola hierarkis di mana satu *root agent* dapat mendelegasikan tugas ke sub-agen yang lebih spesifik, memungkinkan pemisahan tanggung jawab yang bersih.

### 2.2.3 *Strategy Pattern* untuk Provider LLM

*Strategy Pattern* (Gamma et al., 1994) adalah pola desain perangkat lunak yang memungkinkan pemilihan algoritma secara dinamis pada *runtime*. Dalam konteks sistem multi-agent, pola ini digunakan untuk mengabstraksi pemilihan provider LLM:

```
Abstract Class: LlmProviderStrategy
  ├── NebiusProviderStrategy    → DeepSeek V4 Pro via Nebius AI
  └── GeminiProviderStrategy    → Google Gemini
```

Setiap strategi mengimplementasikan metode `getModel()` yang mengembalikan instance model yang sesuai. Pemilihan strategi dilakukan melalui variabel lingkungan `LLM_PROVIDER`, memungkinkan pergantian provider tanpa mengubah kode agen.

## 2.3 Alergi Makanan dan Manajemen Risiko

### 2.3.1 Definisi Alergi Makanan

Alergi makanan adalah reaksi abnormal sistem kekebalan tubuh terhadap protein tertentu dalam makanan yang sebenarnya tidak berbahaya bagi kebanyakan orang (Boyce et al., 2010). Reaksi alergi dapat berkisar dari gejala ringan (gatal-gatal, ruam) hingga *anafilaksis* yang mengancam jiwa.

Prevalensi alergi makanan meningkat secara global, dengan perkiraan 2-10% populasi dunia terpengaruh (Sicherer & Sampson, 2018). Di Indonesia, data prevalensi alergi makanan masih terbatas, namun diperkirakan sekitar 3-7% pada anak-anak dan 1-3% pada dewasa.

### 2.3.2 Alergen Utama

Organisasi Kesehatan Dunia (WHO) mengidentifikasi delapan kelompok makanan yang bertanggung jawab atas 90% reaksi alergi makanan di seluruh dunia, dikenal sebagai **Big-8 Allergens**:

1. Susu sapi (*milk*)
2. Telur (*eggs*)
3. Kacang tanah (*peanuts*)
4. Kacang pohon (*tree nuts*)
5. Ikan (*fish*)
6. Kerang-kerangan (*shellfish*)
7. Gandum (*wheat*)
8. Kedelai (*soy*)

Penelitian ini membatasi pada empat alergen utama yang paling relevan untuk konteks kuliner Indonesia: **kacang, susu, telur, dan seafood**. Pembatasan ini sesuai dengan saran Sicherer & Sampson (2018) bahwa sistem rekomendasi alergi harus fokus pada alergen yang paling umum dan berbahaya di wilayah geografis tertentu.

### 2.3.3 *Hidden Ingredients* dan Kontaminasi Silang

*Hidden ingredients* adalah bahan makanan yang tidak terlihat dari nama hidangan atau deskripsi menu, tetapi terkandung dalam proses pembuatan. Contoh umum termasuk:
- Kecap mengandung kedelai
- Saus teriyaki mengandung gandum
- Santan mengandung kelapa (bukan susu, tetapi sering disalahartikan)

*Cross-contamination risk* adalah risiko alergen berpindah ke makanan yang seharusnya aman melalui peralatan masak bersama, minyak goreng bersama, atau area persiapan yang sama.

Penelitian ini menyimpan data *hidden ingredients* dan *cross-contamination risk* pada setiap item menu untuk memberikan informasi komprehensif kepada pengguna.

## 2.4 *Multi-Criteria Weighted Scoring*

### 2.4.1 Konsep Dasar

*Multi-Criteria Decision Making* (MCDM) adalah pendekatan untuk mengambil keputusan ketika terdapat beberapa kriteria yang saling bertentangan (Keeney & Raiffa, 1976). *Weighted Scoring Model* (WSM) adalah metode MCDM di mana setiap kriteria diberikan bobot numerik yang mencerminkan tingkat kepentingannya, dan skor total dihitung sebagai penjumlahan terbobot.

Formula umum WSM:

```
Score = Σ (Bobot_i × Skor_i)
```

di mana:
- Bobot_i adalah bobot kriteria ke-i (Σ bobot = 1 atau 100%)
- Skor_i adalah nilai item pada kriteria ke-i (ternormalisasi)

### 2.4.2 Penerapan dalam Sistem Rekomendasi Makanan

Hafez et al. (2021) mengusulkan *multi-criteria recommendation system* untuk *online grocery* yang menggunakan *allergen precondition filter* sebelum *similarity scoring*. Pendekatan ini memastikan bahwa keamanan pangan menjadi prioritas utama sebelum kriteria lain dievaluasi.

Penelitian terdahulu menunjukkan bahwa skor dapat mengintegrasikan keamanan dan preferensi pengguna. Dalam penelitian ini, penerapannya dibatasi pada alergi makanan; karakter sensoris berupa renyah, lembut, hangat, dan aromatik; serta cita rasa berupa pedas, manis, asam, dan gurih.

Penelitian ini mengadopsi kerangka tersebut dengan formula:

```
Score = SafetyBase(60) + SensoryMatch(0 atau 20) + TasteMatch(0 atau 20)
```

dengan ketentuan bahwa *safety* adalah *hard constraint*: jika alergi terdeteksi, skor langsung 0 tanpa evaluasi kriteria lain.

### 2.4.3 *Hard Constraint* vs *Soft Constraint*

Dalam sistem rekomendasi, *hard constraint* adalah aturan yang tidak dapat dilanggar — item yang melanggar *hard constraint* dihapus sepenuhnya dari hasil rekomendasi. *Soft constraint* adalah preferensi yang dapat dikompromikan — item yang melanggar tetap dapat direkomendasikan dengan skor lebih rendah (Hafez et al., 2021).

Penelitian ini memperlakukan **keamanan alergi sebagai *hard constraint***: menu yang mengandung alergen pengguna secara otomatis diklasifikasikan sebagai *unsafe* dan dikeluarkan dari daftar rekomendasi utama. Keputusan ini didasarkan pada pertimbangan bahwa keselamatan pengguna tidak dapat dinegosiasikan.

## 2.5 *User-Centered Design* (UCD)

### 2.5.1 Definisi

*User-Centered Design* (UCD) adalah pendekatan perancangan interaktif yang berfokus pada kebutuhan, keterbatasan, dan preferensi pengguna di setiap tahap pengembangan (ISO 9241-210:2019). Standar ini menekankan bahwa seluruh keputusan desain harus didasarkan pada pemahaman yang jelas tentang konteks penggunaan.

Empat prinsip utama UCD menurut ISO 9241-210:

1. **Memahami Konteks Pengguna** (*Understand Context of Use*): Mengidentifikasi siapa pengguna, apa tugas mereka, dan dalam lingkungan apa mereka bekerja.

2. **Menentukan Kebutuhan Pengguna** (*Specify User Requirements*): Menerjemahkan konteks penggunaan menjadi kebutuhan fungsional dan non-fungsional yang terukur.

3. **Menghasilkan Solusi Desain** (*Produce Design Solutions*): Membuat purwarupa yang memenuhi kebutuhan pengguna secara iteratif.

4. **Mengevaluasi Desain** (*Evaluate Designs*): Menguji solusi dengan pengguna nyata untuk memastikan efektivitas dan kepuasan.

Penelitian ini menggunakan UCD sebagai kerangka metodologi karena sistem rekomendasi makanan berbasis multi-agent memerlukan pemahaman mengenai konteks medis (alergi), preferensi sensoris, dan preferensi cita rasa pengguna.

### 2.5.2 Persona

Persona adalah representasi fiktif dari target pengguna yang didasarkan pada data nyata atau hipotesis yang terverifikasi (Cooper, 1999). Persona membantu pengembang memahami motivasi, tujuan, dan *pain points* pengguna selama proses perancangan.

Karakteristik persona yang efektif meliputi:
- Nama dan demografi
- Tujuan (*goals*) — apa yang ingin dicapai
- Perilaku (*behaviors*) — bagaimana pengguna berinteraksi
- Titik masalah (*pain points*) — hambatan yang dihadapi
- Skenario penggunaan — kapan dan di mana sistem digunakan

Penelitian ini merancang tiga persona (Andi, Budi, Dedi) yang merepresentasikan variasi profil alergi, preferensi sensoris, dan preferensi cita rasa.

### 2.5.3 *User Story*

*User Story* adalah format spesifikasi kebutuhan yang berfokus pada nilai pengguna, umum digunakan dalam pengembangan *Agile* (Cohn, 2004). Format standar:

```
Sebagai [peran], saya ingin [fungsi], sehingga [manfaat].
```

*User Story* dipilih karena:
- Berfokus pada *apa* yang dibutuhkan, bukan *bagaimana* mengimplementasikannya
- Mudah dipahami oleh semua pemangku kepentingan
- Memungkinkan prioritas dan iterasi yang fleksibel

### 2.5.4 *System Usability Scale* (SUS)

*System Usability Scale* (SUS) adalah kuesioner 10 item yang dikembangkan oleh Brooke (1996) untuk mengukur *usability* suatu sistem secara subjektif. SUS menghasilkan skor 0-100 yang dapat diinterpretasikan menggunakan *adjective scale* (Sauro & Lewis, 2016):

| Rentang | *Adjective* | *Grade* |
|---------|-------------|---------|
| 90-100 | *Best Imaginable* | A |
| 80-89 | *Excellent* | B |
| 70-79 | *Good* | C |
| 60-69 | *OK* | D |
| 0-59 | *Poor* | F |

## 2.6 *Agentic UI*

### 2.6.1 Definisi

*Agentic UI* adalah paradigma antarmuka di mana elemen-elemen visual beradaptasi secara proaktif berdasarkan hasil penalaran agen kecerdasan buatan (Brahimi, 2025). Berbeda dengan antarmuka konvensional yang statis atau responsif terhadap input langsung pengguna, *Agentic UI* mengantisipasi kebutuhan pengguna dan mengambil tindakan preventif atau rekomendasi secara otomatis.

Karakteristik *Agentic UI* meliputi:
- **Proaktif**: Antarmuka mengambil inisiatif, bukan hanya merespons input pengguna
- **Kontekstual**: Adaptasi didasarkan pada konteks pengguna yang kaya (profil, riwayat, preferensi)
- **Transparan**: Alasan di balik setiap adaptasi ditampilkan kepada pengguna
- **Kontrol**: Pengguna tetap memiliki kendali penuh atas sistem

### 2.6.2 Penerapan dalam Konteks Keamanan Pangan

Penelitian ini mengimplementasikan *Agentic UI* dalam bentuk:

1. **Tindakan Preventif Visual**: Menu yang terdeteksi mengandung alergen secara otomatis:
   - Ditandai dengan *badge* peringatan merah
   - Tombol interaksi dikunci (*disabled*)
   - Ditampilkan di bagian terpisah dengan latar redup

2. **Skor Kecocokan Dinamis**: Setiap menu aman menampilkan skor kecocokan yang dihitung secara *real-time* oleh *Psychological Scorer*.

3. **Penjelasan Rasional**: Setiap rekomendasi dan peringatan dilengkapi dengan penjelasan tekstual mengapa suatu menu direkomendasikan atau tidak aman.

Pendekatan ini selaras dengan prinsip *explainable AI* (XAI) yang menekankan transparansi keputusan sistem cerdas (Gunning et al., 2019).

## 2.7 Penelitian Terdahulu

### 2.7.1 Matriks Penelitian

| No | Peneliti | Tahun | Judul | Metode | Fokus | Keterkaitan |
|----|----------|-------|-------|--------|-------|-------------|
| 1 | Hafez et al. | 2021 | *Multi-criteria recommendation systems to foster online grocery* | *Content-based filtering* + *weighted scoring* | Rekomendasi belanja online dengan *allergen precondition filter* | Dasar konseptual *allergen constraint filtering* dan *multi-criteria scoring* |
| 2 | Kalpakoglou et al. | 2025 | *An AI-based nutrition recommendation system: validation with Mediterranean cuisine* | *Scoring system* + *LLM integration* | Rekomendasi nutrisi personal dengan deteksi alergi | Dasar konseptual integrasi AI dan *scoring* untuk rekomendasi makanan |
| 3 | Hamdollahi Oskouei & Hashemzadeh | 2023 | *FoodRecNet: personalized food recommender using deep neural networks* | *Deep neural networks* + *attribute similarity* | Personalisasi rekomendasi makanan berbasis atribut | Dasar konseptual *similarity scoring* berbasis atribut item |
| 4 | Brahimi | 2025 | *AI-powered dining: personalized menu recommendations and food allergy management* | *Multi-agent system* + *rule-based filtering* | Arsitektur sistem rekomendasi menu dengan deteksi alergi | Dasar konseptual *Agentic UI* dan integrasi AI + *rule-based* |
| 5 | Schick et al. | 2023 | *Toolformer: language models can teach themselves to use tools* | *Tool-augmented LLM* | LLM yang dapat menggunakan *tool* eksternal | Dasar konseptual *Tool-Augmented Generation* |
| 6 | Penelitian ini | 2026 | Sistem rekomendasi menu makanan berbasis *multi-agent* dengan deteksi alergi | *Multi-agent system* + *weighted scoring* + *Agentic UI* | Rekomendasi menu dengan *Agentic UI* untuk keamanan alergi + personalisasi rasa | **—** |

### 2.7.2 Posisi Penelitian

Penelitian ini berada pada posisi yang mempertemukan beberapa bidang:

1. **Sistem Rekomendasi Makanan**: Mengadopsi kerangka *content-based filtering* dari Hafez et al. (2021) dan Kalpakoglou et al. (2025), dengan fokus pada konteks kuliner Indonesia.

2. **Multi-Agent System**: Mengimplementasikan arsitektur multi-agent menggunakan Google ADK, dengan pemisahan agen berdasarkan domain (medis vs psikologis).

3. **Tool-Augmented Generation**: Mengintegrasikan Exa Search Engine dengan LLM untuk analisis menu yang lebih akurat, mengikuti paradigma TAG dari Schick et al. (2023).

4. ***Agentic UI***: Menerapkan prinsip *Agentic UI* dari Brahimi (2025) dalam konteks keamanan pangan, di mana antarmuka secara proaktif menampilkan peringatan dan mengunci aksi berbahaya.

Kontribusi utama penelitian ini adalah **integrasi** dari keempat bidang tersebut dalam satu sistem yang berfungsi, dengan fokus pada keamanan pengguna (deteksi alergi) sebagai *hard constraint* dan personalisasi preferensi sebagai *soft objective*.

## 2.8 Kerangka Berpikir

Berdasarkan landasan teori yang telah diuraikan, kerangka berpikir penelitian ini dapat digambarkan sebagai berikut:

```
┌─────────────────────────────────────────────────────────┐
│                    INPUT                                 │
│  • Profil alergi pengguna (kacang, susu, telur, seafood) │
│  • Sensoris (renyah, lembut, hangat, aromatik)          │
│  • Cita rasa (pedas, manis, asam, gurih)                │
│  • Data menu (bahan, alergen, sensoris, rasa)           │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              MULTI-AGENT SYSTEM (MAS)                    │
│                                                         │
│  ┌──────────────────┐   ┌──────────────────────────┐   │
│  │ Medical Filter   │   │ Knowledge Agent (ADK)    │   │
│  │ (Deterministik)  │   │ (DeepSeek V4 Pro + Exa) │   │
│  │ • Query Prisma   │   │ • Ekstraksi bahan       │   │
│  │ • hasSome alergen │   │ • Deteksi alergen       │   │
│  │ • safe vs unsafe  │   │ • Analisis nutrisi      │   │
│  └────────┬─────────┘   └───────────┬──────────────┘   │
│           │                         │                   │
│           ▼                         ▼                   │
│  ┌──────────────────────────────────────────────┐      │
│  │          Psychological Scorer                 │      │
│  │  Multi-Criteria Weighted Scoring (60+20+20)   │      │
│  │  • Safety + Sensory Match + Taste Match       │      │
│  └───────────────────┬──────────────────────────┘      │
│                      │                                  │
└──────────────────────┼──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                 AGENTIC UI (OUTPUT)                      │
│  • Daftar menu aman (sorted by match score)              │
│  • Daftar menu tidak aman (badge + disabled button)     │
│  • Penjelasan rasional setiap rekomendasi               │
│  • Adaptasi real-time tanpa reload                      │
└─────────────────────────────────────────────────────────┘
```

## 2.9 Hipotesis

Berdasarkan landasan teori yang telah diuraikan, hipotesis penelitian ini adalah:

1. **H1**: Penerapan *Medical Filter* deterministik efektif mencapai akurasi 100% dalam mendeteksi alergen pada dataset uji yang terstruktur.

2. **H2**: Arsitektur *multi-agent* dengan pemisahan agen medis dan psikologis menghasilkan rekomendasi yang lebih akurat dibandingkan pendekatan *single-agent* karena setiap agen memiliki fokus dan tanggung jawab yang spesifik.

3. **H3**: Waktu pemrosesan *multi-agent* sistem tetap di bawah 500ms karena komponen deterministik (Medical Filter) bekerja tanpa inferensi LLM.

4. **H4**: Penerapan *Agentic UI* (peringatan visual, tombol *disabled*, penjelasan rasional) meningkatkan rasa aman dan kepercayaan pengguna terhadap rekomendasi sistem.
