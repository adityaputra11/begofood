import { z } from 'zod';
import { FunctionTool } from '@google/adk';
import type { PrismaService } from '../../prisma/prisma.service.js';

const VALID_ALLERGENS = [
  'kacang',
  'susu',
  'gluten',
  'telur',
  'seafood',
  'kedelai',
  'wijen',
  'sulfit',
] as const;

const VALID_DIETS = [
  'vegetarian',
  'vegan',
  'low_carb',
  'high_protein',
  'halal',
  'gluten_free',
  'low_fat',
  'none',
] as const;

const VALID_TAGS = ['spicy', 'savory', 'sweet', 'sour'] as const;

export function createSavePreferenceTool(prisma: PrismaService): FunctionTool {
  return new FunctionTool({
    name: 'save_preference',
    description: `Simpan preferensi pengguna (alergi, diet, atau pantangan makanan).
Panggil tool ini ketika user mengatakan sesuatu seperti:
- "Aku alergi kacang"
- "Aku lagi diet low carb"
- "Aku gak bisa makan seafood"
- "Aku vegetarian"
- "Aku gak suka yang manis"

Valid allergens: ${VALID_ALLERGENS.join(', ')}
Valid diets: ${VALID_DIETS.join(', ')}
Valid dislike tags: ${VALID_TAGS.join(', ')}`,
    parameters: z.object({
      allergies: z
        .array(z.string())
        .optional()
        .describe(`Daftar alergi yang valid: ${VALID_ALLERGENS.join(', ')}`),
      diet: z
        .string()
        .optional()
        .describe(`Diet yang valid: ${VALID_DIETS.join(', ')}`),
      dislikedTags: z
        .array(z.string())
        .optional()
        .describe(`Rasa/kategori yang tidak disukai: ${VALID_TAGS.join(', ')}`),
    }),
    execute: async ({ allergies, diet, dislikedTags }, toolContext) => {
      const userId = toolContext?.userId;
      if (!userId) {
        return { success: false, message: 'User ID tidak ditemukan.' };
      }

      // ── Validasi ──
      const unknownAllergies =
        allergies?.filter(
          (a) => !(VALID_ALLERGENS as readonly string[]).includes(a),
        ) ?? [];
      const unknownDiet =
        diet && !(VALID_DIETS as readonly string[]).includes(diet)
          ? diet
          : null;
      const normalizedTags = normalizeDislikedTags(dislikedTags);
      const validTags =
        normalizedTags.filter((t) =>
          (VALID_TAGS as readonly string[]).includes(t),
        ) ?? [];
      const unknownTags =
        normalizedTags.filter(
          (t) => !(VALID_TAGS as readonly string[]).includes(t),
        ) ?? [];

      if (
        unknownAllergies.length > 0 ||
        unknownDiet ||
        unknownTags.length > 0
      ) {
        const parts: string[] = [];
        if (unknownAllergies.length > 0) {
          parts.push(
            `"${unknownAllergies.join(', ')}" tidak dikenal. Alergi yang didukung: ${VALID_ALLERGENS.join(', ')}`,
          );
        }
        if (unknownDiet) {
          parts.push(
            `"${unknownDiet}" tidak dikenal. Diet yang didukung: ${VALID_DIETS.join(', ')}`,
          );
        }
        if (unknownTags.length > 0) {
          parts.push(
            `"${unknownTags.join(', ')}" tidak dikenal. Tag yang didukung: ${VALID_TAGS.join(', ')}`,
          );
        }
        throw new Error(parts.join('. '));
      }

      // ── Semua valid → simpan ──
      await savePreference(prisma, userId, {
        allergies,
        diet,
        dislikedTags: validTags,
      });

      const saved = await prisma.userPreference.findUnique({
        where: { userId },
      });
      const allergyText = saved?.allergies?.length
        ? `Alergi: ${saved.allergies.join(', ')}`
        : 'Tidak ada alergi tersimpan';
      const dietText = saved?.diet
        ? `Diet: ${saved.diet}`
        : 'Tidak ada diet tersimpan';
      const tagsText = saved?.dislikedTags?.length
        ? `Gak suka: ${saved.dislikedTags.join(', ')}`
        : '';

      const msg = [allergyText, dietText, tagsText].filter(Boolean).join('. ');

      return {
        success: true,
        message: `Preferensi berhasil disimpan! ${msg}.`,
        preferences: saved,
      };
    },
  });
}

function normalizeDislikedTags(tags?: string[]): string[] {
  const map: Record<string, string> = {
    pedas: 'spicy',
    manis: 'sweet',
    asam: 'sour',
    gurih: 'savory',
    pahit: 'savory',
  };
  return (tags ?? []).map((t) => map[t.toLowerCase()] || t);
}

async function savePreference(
  prisma: PrismaService,
  userId: string,
  data: { allergies?: string[]; diet?: string; dislikedTags?: string[] },
): Promise<void> {
  const existing = await prisma.userPreference.findUnique({
    where: { userId },
  });

  if (existing) {
    await prisma.userPreference.update({
      where: { userId },
      data: {
        ...(data.allergies !== undefined ? { allergies: data.allergies } : {}),
        ...(data.diet !== undefined ? { diet: data.diet } : {}),
        ...(data.dislikedTags !== undefined
          ? { dislikedTags: data.dislikedTags }
          : {}),
      },
    });
  } else {
    await prisma.userPreference.create({
      data: {
        userId,
        allergies: data.allergies ?? [],
        diet: data.diet ?? null,
        dislikedTags: data.dislikedTags ?? [],
      },
    });
  }
}
