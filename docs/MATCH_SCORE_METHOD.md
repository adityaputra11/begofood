# Metode Match Score Alergi, Sensoris, dan Cita Rasa

> **Peringatan metodologis:** bobot 60, 20, dan 20 merupakan nilai heuristik rancangan pengembang. Bobot belum diturunkan melalui AHP, *conjoint analysis*, eksperimen pengguna, atau validasi pakar.

## Ruang Lingkup

Sistem menggunakan tiga kelompok data sesuai batas penelitian:

- alergi: kacang, susu, telur, dan seafood;
- karakter sensoris: renyah, lembut, hangat, dan aromatik;
- cita rasa: pedas, manis, asam, dan gurih.

Karakter sensoris dan cita rasa merupakan dua variabel yang berbeda. Sensoris disimpan pada `sensoryProfile`, sedangkan cita rasa disimpan sebagai tag `spicy`, `sweet`, `sour`, dan `savory`. Pola makan atau preferensi *dietary* tidak menjadi komponen penelitian.

## Formula

```text
Jika menu mengandung alergen pengguna → score = 0 dan status = unsafe

Score = SafetyBase(60) + SensoryMatch(0 atau 20) + TasteMatch(0 atau 20)
```

| Komponen | Bobot | Implementasi |
|---|---:|---|
| Safety Base | 60 | Diberikan hanya kepada menu yang lolos *hard constraint* alergi |
| Sensory Match | 0 atau 20 | Diberikan jika karakter sensoris menu sesuai preferensi pengguna |
| Taste Match | 0 atau 20 | Diberikan jika tag cita rasa menu sesuai preferensi pengguna |

Keamanan alergi diperlakukan sebagai *hard constraint*. Menu berkonflik selalu mendapat skor 0 dan tidak masuk rekomendasi utama.

## Alur

```text
Profil alergi + preferensi sensoris + preferensi cita rasa
                         ↓
Medical Filter
  ├─ konflik alergen → unsafe, score 0
  └─ aman → Safety Base 60
                         ↓
Psychological Scorer
  ├─ Sensory Match 0/20
  └─ Taste Match 0/20
                         ↓
Urutkan menu aman berdasarkan score menurun
```

## Rentang Skor

| Skenario | Perhitungan | Skor |
|---|---:|---:|
| Mengandung alergen | *Hard constraint* | 0 |
| Aman tanpa kecocokan | 60 + 0 + 0 | 60 |
| Aman dan cocok pada satu dimensi | 60 + 20 + 0 | 80 |
| Aman serta cocok sensoris dan rasa | 60 + 20 + 20 | 100 |

## Pseudocode

```typescript
function calculateMatchScore(item, preferences): number {
  if (preferences.allergies.some((a) => item.allergens.includes(a))) {
    return 0;
  }

  const sensoryScore = preferences.preferredSensory.some((value) =>
    item.sensoryProfile.includes(value),
  ) ? 20 : 0;

  const tasteScore = preferences.preferredTastes.some((tag) =>
    item.tags.includes(tag),
  ) ? 20 : 0;

  return 60 + sensoryScore + tasteScore;
}
```

## Keterbatasan

- Bobot masih heuristik dan perlu divalidasi melalui metode pembobotan formal atau eksperimen pengguna.
- Metadata alergen perlu dikonfirmasi oleh restoran atau pakar sebelum penerapan nyata.
- Skor menunjukkan kecocokan dalam purwarupa, bukan nilai kesehatan atau jaminan klinis.
