# Metode Multi-Criteria Weighted Match Score

## Ringkasan

Sistem rekomendasi menu menggunakan **Multi-Criteria Weighted Scoring** untuk menghitung tingkat kecocokan (`matchScore`) antara preferensi pengguna dan item menu. Safety diperlakukan sebagai **hard constraint** (bukan bobot) — jika menu mengandung alergen user, score langsung 0 tanpa evaluasi criteria lain.

## Alur Scoring

```
Input Preferensi User
  ├── Alergi (allergies) — hard constraint
  ├── Diet (diet)
  ├── Rasa yang Dihindari (dislikedTags)
  └── Sensory Craving (sensory)

        ↓

Filter Keamanan (Hard Constraint)
  ├── Jika menu mengandung alergen user → unsafe (score = 0)
  └── Jika aman → safety base = 40, lanjut ke scoring

        ↓

Multi-Criteria Weighted Scoring
  ├── Safety Base (40) → aman dari alergi
  ├── Diet (25)        → tag diet sesuai preferensi
  ├── Sensory (20)     → cocok dengan craving user
  ├── Disliked (-20)   → penalty jika mengandung rasa yang dihindari
  └── Rating (15)      → popularitas menu

        ↓

Final Score (0–100) + Sortir Descending
```

## Bobot & Reasoning

### Safety — Hard Constraint + Base Score 40

**Alasan 40 (bukan 30, 50, dll):**
- Safety harus menjadi prioritas tertinggi dalam rekomendasi makanan karena menyangkut risiko kesehatan.
- 40 dipilih agar safety **dominan** (tertinggi dibanding criteria lain: 25, 20, 15) tapi **tidak terlalu dominan** hingga criteria lain tidak berarti.
- Jika safety = 50: criteria lain total hanya 50 → personalisasi melemah.
- Jika safety = 30: criteria lain total 70 → safety bisa dikalahkan oleh kombinasi sensory + rating, tidak ideal.
- **40 : 60** (safety : lainnya) dianggap balance — safety selalu jadi pertimbangan utama, tapi preferensi lain tetap impactful.

**Implementasi:**
- Jika alergi user terdaftar dan menu mengandung alergen tersebut → **return 0** (hard constraint).
- Jika aman → **+40 poin** (base score).

*Referensi: Hafez et al. (2021) — allergen precondition filter sebelum similarity scoring.*

### Diet — 25%

**Alasan 25:**
- Preferensi diet (vegetarian, vegan, low_carb, halal) bersifat **binary** (cocok/tidak) dan merupakan preferensi jangka panjang.
- 25% dari total lebih rendah dari safety karena diet tidak mengancam kesehatan seperti alergi.
- Nilai ini dipilih agar diet memiliki bobot lebih besar dari sensory (20) yang bersifat situasional, tapi tidak melampaui safety.

**Implementasi:**
- Jika user memiliki preferensi diet dan menu memiliki tag diet sesuai → +25.
- Jika tidak sesuai → 0.
- Jika user tidak punya preferensi diet → +25 (full marks — tidak ada penalti untuk tidak memiliki diet).

*Referensi: Kalpakoglou et al. (2025) — diet sebagai primary filter setelah allergen.*

### Sensory — 20%

**Alasan 20:**
- Craving sensoris (pedas, gurih, renyah) bersifat **situasional** — user bisa bilang "lagi ingin pedas" hari ini dan berbeda besok.
- Bobot 20% lebih rendah dari diet (25) karena sifatnya jangka pendek.
- Total maksimal 3 sensory match.

**Alasan 7 poin per match (bukan 5, 10, dll):**
- 1 match: 7 poin (cukup bermakna untuk mempengaruhi ranking).
- 2 match: 14 poin (signifikan).
- 3 match: 21 → di-cap 20 (maksimal).
- Jika per match = 10: 2 match sudah 20, 3 match redundant.
- Jika per match = 5: 3 match = 15, kurang membedakan.
- **7 poin per match** memberikan gradasi yang smooth: 7 → 14 → 20.

**Implementasi:** `min(20, matchedSensory × 7)`

*Referensi: Hamdollahi Oskouei & Hashemzadeh (2023) — similarity scoring berbasis atribut item.*

### Disliked Tags — -20%

**Alasan -20 (bukan -10, -30):**
- Preferensi negatif (misal "gak suka manis") harus signifikan tapi tidak sekuat alergi.
- -20 membuatnya **sama kuat** dengan sensory positif (+20), sehingga preferensi positif dan negatif balance.
- Jika penalty terlalu besar (-30): satu rasa yang tidak disukai bisa menghapus hampir semua kontribusi criteria lain.
- Jika penalty terlalu kecil (-10): preferensi negatif mudah diabaikan oleh rating atau sensory.

**Alasan penalty (bukan hard constraint):**
- Rasa yang dihindari tidak mengancam kesehatan seperti alergi, jadi tidak perlu hard constraint.
- User mungkin tetap mau makan makanan manis meskipun "gak suka manis" dalam konteks tertentu.

**Implementasi:** Jika menu memiliki tag yang masuk dislikedTags → -20.

*Referensi: Kalpakoglou et al. (2025) — negative preference sebagai dietary constraint enforcement.*

### Rating — 15%

**Alasan 15 (bukan 10, 20, dll):**
- Rating adalah sinyal **kolaboratif** (pendapat orang lain), bukan preferensi personal.
- Personalisasi harus lebih dominan daripada popularitas, maka rating mendapat bobot terkecil.
- 15 dipilih agar rating masih bisa mempengaruhi ranking antar menu dengan score yang sama, tapi tidak mendominasi.
- Contoh: rating 4.0 → +12, rating 3.0 → +9. Selisih 3 poin cukup untuk menentukan urutan tanpa terlalu signifikan.

**Implementasi:** `round((rating / 5) × 15)`
- Rating 5.0 → +15
- Rating 4.0 → +12
- Rating 2.5 → +7
- Rating 0 → +0

*Referensi: Hamdollahi Oskouei & Hashemzadeh (2023) — popularity score sebagai sinyal tambahan.*

## Final Score Calculation

```
IF mengandung alergen → return 0 (UNSAFE)

total = 40 (safety base)
      + dietScore (0 atau 25)
      + sensoryScore (0–20, increment 7)
      + ratingScore (0–15, berdasarkan rating/5)
      - penalty (0 atau 20, jika ada rasa yang dihindari)

finalScore = clamp(total, 0, 100)
```

**Range:**

| Skenario | Score |
|----------|-------|
| Maksimal (aman, diet cocok, 3 sensory match, rating 5, tidak ada rasa dihindari) | 40 + 25 + 20 + 15 - 0 = **100** |
| Minimal (aman, diet tidak cocok, 0 sensory, rating 0, ada rasa dihindari) | 40 + 0 + 0 + 0 - 20 = **20** |
| Minimal tanpa penalti | 40 + 0 + 0 + 0 - 0 = **40** |

## Klasifikasi Output

| Kategori | Score | SafetyStatus | Deskripsi |
|----------|-------|-------------|-----------|
| **Unsafe** | 0 | `unsafe` | Mengandung alergen user (hard constraint) |
| **Safe** | 40–100 | `safe` | Aman dari alergi, diurutkan berdasarkan match score |

## Pseudocode

```
function calculateMatchScore(item, preferences, matchedSensory):
    // Safety — hard constraint
    if preferences.allergies.length > 0:
        if item contains any allergen from preferences.allergies:
            return 0  // unsafe

    // Safety base
    score = 40

    // Diet — 25%
    if preferences.diet exists:
        score += item.tags.includes(diet) ? 25 : 0
    else:
        score += 25

    // Sensory — 20% (7 poin per match, cap 20)
    score += min(20, matchedSensory.length × 7)

    // Disliked penalty — -20%
    if preferences.dislikedTags.length > 0:
        if item.tags contains any disliked tag:
            score -= 20

    // Rating — 15%
    score += round((item.rating / 5) × 15)

    return clamp(score, 0, 100)
```

## Visualisasi Bobot

```
                    Safety (base)
                  +----------------+
                  |      40        |  ← Hard constraint + base
                  +----------------+
        Diet      |      25        |
                  +----------------+
       Sensory    |      20        |
                  +----------------+
       Rating     |      15        |
                  +----------------+
                       100

    Penalty: -20 jika ada rasa yang dihindari
```

## Dataset Menu

Dataset terdiri dari **36 item menu** yang dikumpulkan dari restoran ternama di Indonesia:

- **Western & Indonesia** — 18 menu
- **Chinese Food** — 9 menu
- **Seafood** — 9 menu

Setiap menu memiliki: sensoryProfile, allergens, tags, hiddenIngredients, rating, dan informasi harga.

## Referensi

| # | Referensi | Tahun | Relevansi |
|---|-----------|-------|-----------|
| 1 | **Hafez et al.** "Multi-criteria recommendation systems to foster online grocery." *Sensors* 21(19). | 2021 | Allergen precondition filter + weighted similarity scores — dasar constraint filtering. |
| 2 | **Kalpakoglou et al.** "An AI-based nutrition recommendation system: validation with Mediterranean cuisine." *Frontiers in AI*. | 2025 | Scoring system dengan diet & allergen personalization. |
| 3 | **Hamdollahi Oskouei & Hashemzadeh.** "FoodRecNet: personalized food recommender using deep neural networks." *Information Systems Frontiers*. | 2023 | Similarity scoring + popularity signal untuk ranking. |
| 4 | **Brahimi.** "AI-powered dining: personalized menu recommendations and food allergy management." *IJIT*. | 2025 | Arsitektur sistem rekomendasi menu personal dengan deteksi alergi. |
| 5 | **Tran et al.** "Recommender systems in the healthcare domain: state-of-the-art and research issues." *J. Intelligent Information Systems* 57. | 2021 | Survey multi-criteria recommendation untuk dietary constraints. |
