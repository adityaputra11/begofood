# Psychological Scorer — Source Code (Inti)

**File:** `apps/backend/src/agent/match-score.ts`

```typescript
export function calculateMenuMatchScore(item, preferences): number {
  const { allergies, preferredSensory, preferredTastes } = preferences;

  if (allergies.some((a) => item.allergens.includes(a))) return 0;

  const sensoryScore = preferredSensory.some((value) =>
    item.sensoryProfile.includes(value),
  ) ? 20 : 0;

  const tasteScore = preferredTastes.some((tag) => item.tags.includes(tag))
    ? 20
    : 0;

  return 60 + sensoryScore + tasteScore;
}
```

## Formula Skor

```text
Score = SafetyBase(60) + SensoryMatch(0/20) + TasteMatch(0/20)
Range: 0 (unsafe) atau 60–100 (safe)
```

| Kriteria | Bobot | Cara Hitung |
|---|---:|---|
| Safety Base | 60 | Otomatis setelah menu lolos pemeriksaan alergi |
| Sensory Match | 0 atau 20 | 20 jika karakter sensoris sesuai preferensi |
| Taste Match | 0 atau 20 | 20 jika tag cita rasa sesuai preferensi |

Variabel sensoris dibatasi pada renyah, lembut, hangat, dan aromatik. Variabel cita rasa dibatasi pada pedas, manis, asam, dan gurih. Keduanya disimpan dan dihitung secara terpisah.
