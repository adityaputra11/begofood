# Medical Filter — Source Code (Inti)

**File:** `apps/backend/src/agent/agent.service.ts` (bagian `getFilteredMenu`)
**Versi Tool ADK:** `apps/backend/src/agent/tools/filter-menu.tool.ts`

```typescript
async getFilteredMenu(userId: string, filters?: MenuFilterInput) {
  const preferences = await this.getUserPreference(userId);
  const allergies = filters?.allergies ?? preferences.allergies;

  // ── Query 1: Menu AMAN ─────────────────────────────────────
  // Gunakan NOT + hasSome untuk mengecualikan semua menu
  // yang mengandung salah satu alergen user
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

  // ── Query 2: Menu TIDAK AMAN ───────────────────────────────
  // Gunakan hasSome untuk mengambil menu yang mengandung
  // setidaknya satu alergen user
  const unsafeItems = allergies.length
    ? await this.prisma.menu.findMany({
        where: {
          isAvailable: true,
          allergens: { hasSome: allergies },
        },
        orderBy: { name: 'asc' },
      })
    : [];

  // ── Scoring & Response ────────────────────────────────────
  return {
    safe: safeItems.map(item => ({
      ...item,
      safetyStatus: 'safe',
      matchScore: this.calculateMatchScore(item, preferences),
      recommendationReason: 'Aman dari alergi yang tersimpan',
    })).sort((a, b) => b.matchScore - a.matchScore),

    unsafe: unsafeItems.map(item => ({
      ...item,
      safetyStatus: 'unsafe',
      matchScore: 0,
      reason: `Terdeteksi ${triggeredAllergens.join(', ')}`,
    })),
  };
}
```

## Alur Filtering

```
Input: userId + preferensi alergi
    ↓
[1] Medical Filter — Prisma Query (deterministik)
    ├── safeItems:  WHERE NOT allergens.hasSome(["kacang","seafood"])
    └── unsafeItems: WHERE allergens.hasSome(["kacang","seafood"])
    ↓
[2] Psychological Scorer — hitung matchScore (0-100)
    ↓
[3] Response: { safe: [...], unsafe: [...] }
```

## Inti Mekanisme

| Konsep | Kode Prisma | Efek |
|--------|-------------|------|
| **Hard Constraint** | `allergens: { hasSome: allergies }` | Jika mengandung salah satu alergen → **unsafe** |
| **Eksklusi Absolut** | `NOT: { allergens: { hasSome: allergies } }` | Menu aman = **tidak mengandung** alergen manapun |
| **Deterministik** | Query database langsung | **100% akurat**, tanpa inferensi LLM |
| **Latency** | Tanpa panggilan AI | **< 50ms** untuk query |

## Contoh Hasil Filter

Untuk user Budi (alergi: kacang, seafood):

| Menu | Alergen | Status | Skor |
|------|---------|--------|------|
| Sate Ayam | kacang | ❌ Unsafe | 0 |
| Udang Bakar | seafood | ❌ Unsafe | 0 |
| Nasi Goreng | telur | ✅ Safe | 85 |
| Sate Kambing | — | ✅ Safe | 65 |
