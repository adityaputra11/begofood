# Metode Multi-Criteria Weighted Match Score

## Ringkasan

Sistem rekomendasi menu menggunakan **Multi-Criteria Weighted Scoring** untuk menghitung tingkat kecocokan (`matchScore`) antara preferensi pengguna dan item menu. Safety diperlakukan sebagai **hard constraint** — jika menu mengandung alergen user, score langsung 0 tanpa evaluasi criteria lain.

**Criteria final yang digunakan:**
- Safety Base **(40)** — hard constraint + base score
- Sensory Match **(20)** — kecocokan dengan craving user
- Preferred Taste **(+20)** — bonus untuk rasa yang disukai

## Alur Scoring

```
Input Preferensi User
  ├── Alergi (allergies) — hard constraint
  └── Preferred Taste (dislikedTags / preferredTags)

        ↓

Filter Keamanan (Hard Constraint)
  ├── Jika menu mengandung alergen user → unsafe (score = 0)
  └── Jika aman → safety base = 40, lanjut ke scoring

        ↓

Multi-Criteria Weighted Scoring
  ├── Safety Base (40)   → aman dari alergi
  ├── Sensory (20)       → cocok dengan craving user (homepage chips)
  └── Preferred Taste (+20) → bonus jika rasa cocok dengan preferensi user

        ↓

Final Score (0–100) + Sortir Descending
```

## Bobot & Reasoning

### Safety — Hard Constraint + Base Score 40

**Alasan 40 (bukan 30, 50, dll):**
- Safety harus menjadi prioritas tertinggi dalam rekomendasi makanan karena menyangkut risiko kesehatan.
- 40 dipilih agar safety **dominan** (tertinggi dibanding criteria lain: 20, 20) tapi tidak terlalu dominan hingga criteria lain tidak berarti.
- Jika safety = 50: criteria lain total hanya 50 → personalisasi melemah.
- Jika safety = 30: criteria lain total 70 → safety bisa dikalahkan.
- **40 : 40** (safety : lainnya) — safety prioritas, preferensi lain tetap impactful.

**Implementasi:**
- Jika alergi user terdaftar dan menu mengandung alergen tersebut → **return 0** (hard constraint).
- Jika aman → **+40 poin** (base score).

*Referensi: Hafez et al. (2021) — allergen precondition filter sebelum similarity scoring.*

### Sensory Match — 20%

**Alasan 20:**
- Craving sensoris (pedas, gurih, renyah) bersifat **situasional** — user bisa pilih "lagi ingin pedas" hari ini.
- Bobot 20% karena ini preferensi jangka pendek.
- Total maksimal 3 sensory match dari homepage chips.

**Alasan 7 poin per match (bukan 5, 10, dll):**
- 1 match: 7 poin (cukup bermakna untuk mempengaruhi ranking).
- 2 match: 14 poin (signifikan).
- 3 match: 21 → di-cap 20 (maksimal).
- Jika per match = 10: 2 match sudah 20, 3 match redundant.
- Jika per match = 5: 3 match = 15, kurang membedakan.
- **7 poin per match** memberikan gradasi yang smooth: 7 → 14 → 20.

**Implementasi:** `min(20, matchedSensory × 7)`

*Referensi: Hamdollahi Oskouei & Hashemzadeh (2023) — similarity scoring berbasis atribut item.*

### Preferred Taste — +20% (Bonus)

**Alasan +20 (bukan -20 penalty):**
- Preferensi rasa dibingkai secara **positif** ("Lagi pengen rasa apa hari ini?"), bukan negatif ("Rasa yang dihindari").
- +20 bonus jika menu memiliki tag rasa yang sesuai dengan preferensi user.
- Bersifat **boost** (bukan penalty) — menu yang cocok dapat tambahan score, menu yang tidak cocok tidak dihukum.

**Alasan 20 (sama dengan sensory match):**
- Sensory match (+20) dan preferred taste (+20) memiliki bobot yang sama karena keduanya adalah preferensi rasa.
- Sensory bersifat **situasional** (homepage chips, per session).
- Preferred taste bersifat **persisten** (tersimpan di profil user).
- Keduanya independen dan bisa stack.

**Implementasi:**
```
if user has preferred tastes:
    if item.tags contains any preferred taste:
        bonus = 20
```

*Referensi: Kalpakoglou et al. (2025) — positive preference enforcement.*

## Final Score Calculation

```
IF mengandung alergen → return 0 (UNSAFE)

total = 40 (safety base)
      + sensoryScore (0–20, increment 7)
      + bonus (0 atau 20, jika rasa cocok)

finalScore = clamp(total, 0, 100)
```

**Range:**

| Skenario | Score |
|----------|-------|
| Maksimal (aman, 3 sensory match, rasa cocok) | 40 + 20 + 20 = **80** |
| Sedang (aman, 0 sensory, rasa cocok) | 40 + 0 + 20 = **60** |
| Minimal (aman, 0 sensory, rasa tidak cocok) | 40 + 0 + 0 = **40** |

> **Catatan:** Score maksimal 80 (bukan 100) karena diet (25) dan rating (15) dihapus. Safety base 40 dari total 80 = 50% bobot safety.

## Klasifikasi Output

| Kategori | Score | SafetyStatus | Deskripsi |
|----------|-------|-------------|-----------|
| **Unsafe** | 0 | `unsafe` | Mengandung alergen user (hard constraint) |
| **Safe** | 40–80 | `safe` | Aman dari alergi, diurutkan berdasarkan match score |

## Pseudocode

```
function calculateMatchScore(item, preferences, matchedSensory):
    // Safety — hard constraint
    if preferences.allergies.length > 0:
        if item contains any allergen from preferences.allergies:
            return 0  // unsafe

    // Safety base
    score = 40

    // Sensory — 20% (7 poin per match, cap 20)
    score += min(20, matchedSensory.length × 7)

    // Preferred taste — +20% bonus
    if preferences.dislikedTags.length > 0:
        if item.tags contains any preferred taste:
            score += 20

    return clamp(score, 0, 100)
```

## Visualisasi Bobot

```
                    Safety (base)
                  +----------------+
                  |      40        |  ← Hard constraint + base
                  +----------------+
       Sensory    |      20        |
                  +----------------+
   Preferred      |      20        |  ← Bonus
                  +----------------+
                        80

    Diet (25%)  ✗ dihapus
    Rating (15%) ✗ dihapus
```

## Perbandingan dengan Versi Sebelumnya

| Criteria | Sebelum | Sesudah | Alasan |
|----------|---------|---------|--------|
| Safety | 40 (base) | 40 (base) | Tetap |
| Diet | 25 | ✗ **Dihapus** | UI "Pola Makan" dihapus |
| Sensory | 20 | 20 | Tetap |
| Disliked Tags | -20 (penalty) | **+20 (bonus)** | Positive framing: "Pengen" bukan "Gak suka" |
| Rating | 15 | ✗ **Dihapus** | Tidak relevan untuk skripsi |

## Dataset Menu

Dataset terdiri dari **36 item menu** yang dikumpulkan dari restoran ternama di Indonesia:

- **Western & Indonesia** — 18 menu
- **Chinese Food** — 9 menu
- **Seafood** — 9 menu

Setiap menu memiliki: sensoryProfile, allergens, tags, hiddenIngredients, dan informasi harga.

## Referensi

| # | Referensi | Tahun | Relevansi |
|---|-----------|-------|-----------|
| 1 | **Hafez et al.** "Multi-criteria recommendation systems to foster online grocery." *Sensors* 21(19). | 2021 | Allergen precondition filter + weighted similarity scores — dasar constraint filtering. |
| 2 | **Kalpakoglou et al.** "An AI-based nutrition recommendation system: validation with Mediterranean cuisine." *Frontiers in AI*. | 2025 | Scoring system dengan personalisasi preferensi. |
| 3 | **Hamdollahi Oskouei & Hashemzadeh.** "FoodRecNet: personalized food recommender using deep neural networks." *Information Systems Frontiers*. | 2023 | Similarity scoring berbasis atribut item. |
| 4 | **Brahimi.** "AI-powered dining: personalized menu recommendations and food allergy management." *IJIT*. | 2025 | Arsitektur sistem rekomendasi menu personal dengan deteksi alergi. |
