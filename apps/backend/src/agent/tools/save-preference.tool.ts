import { z } from 'zod';
import { FunctionTool } from '@google/adk';
import type { PrismaService } from '../../prisma/prisma.service.js';

const VALID_ALLERGENS = [
  'kacang',
  'susu',
  'telur',
  'seafood',
] as const;

const VALID_TAGS = ['spicy', 'savory', 'sweet', 'sour'] as const;
const VALID_SENSORY = ['renyah', 'lembut', 'hangat', 'aromatik'] as const;

export function createSavePreferenceTool(prisma: PrismaService): FunctionTool {
  return new FunctionTool({
    name: 'save_preference',
    description: `Simpan preferensi pengguna berupa alergi, karakter sensoris, dan cita rasa yang diinginkan.
Panggil tool ini ketika user mengatakan sesuatu seperti:
- "Aku alergi kacang"
- "Aku gak bisa makan seafood"
- "Aku suka yang renyah dan manis"

Valid allergens: ${VALID_ALLERGENS.join(', ')}
Valid sensory values: ${VALID_SENSORY.join(', ')}
Valid taste tags: ${VALID_TAGS.join(', ')}`,
    parameters: z.object({
      allergies: z
        .array(z.string())
        .optional()
        .describe(`Daftar alergi yang valid: ${VALID_ALLERGENS.join(', ')}`),
      preferredSensory: z
        .array(z.string())
        .optional()
        .describe(`Karakter sensoris yang diinginkan: ${VALID_SENSORY.join(', ')}`),
      preferredTastes: z
        .array(z.string())
        .optional()
        .describe(`Cita rasa yang diinginkan: ${VALID_TAGS.join(', ')}`),
    }),
    execute: async ({ allergies, preferredSensory, preferredTastes }, toolContext) => {
      const userId = toolContext?.userId;
      if (!userId) {
        return { success: false, message: 'User ID tidak ditemukan.' };
      }

      // ── Validasi ──
      const unknownAllergies =
        allergies?.filter(
          (a) => !(VALID_ALLERGENS as readonly string[]).includes(a),
        ) ?? [];
      const unknownSensory =
        preferredSensory?.filter(
          (value) => !(VALID_SENSORY as readonly string[]).includes(value),
        ) ?? [];
      const normalizedTags = normalizePreferredTastes(preferredTastes);
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
        unknownSensory.length > 0 ||
        unknownTags.length > 0
      ) {
        const parts: string[] = [];
        if (unknownAllergies.length > 0) {
          parts.push(
            `"${unknownAllergies.join(', ')}" tidak dikenal. Alergi yang didukung: ${VALID_ALLERGENS.join(', ')}`,
          );
        }
        if (unknownTags.length > 0) {
          parts.push(
            `"${unknownTags.join(', ')}" tidak dikenal. Tag yang didukung: ${VALID_TAGS.join(', ')}`,
          );
        }
        if (unknownSensory.length > 0) {
          parts.push(
            `"${unknownSensory.join(', ')}" tidak dikenal. Sensoris yang didukung: ${VALID_SENSORY.join(', ')}`,
          );
        }
        throw new Error(parts.join('. '));
      }

      // ── Semua valid → simpan ──
      await savePreference(prisma, userId, {
        allergies,
        preferredSensory,
        preferredTastes: validTags,
      });

      const saved = await prisma.userPreference.findUnique({
        where: { userId },
      });
      const allergyText = saved?.allergies?.length
        ? `Alergi: ${saved.allergies.join(', ')}`
        : 'Tidak ada alergi tersimpan';
      const sensoryText = saved?.preferredSensory?.length
        ? `Sensoris: ${saved.preferredSensory.join(', ')}`
        : '';
      const tagsText = saved?.preferredTastes?.length
        ? `Cita rasa: ${saved.preferredTastes.join(', ')}`
        : '';

      const msg = [allergyText, sensoryText, tagsText].filter(Boolean).join('. ');

      return {
        success: true,
        message: `Preferensi berhasil disimpan! ${msg}.`,
        preferences: saved,
      };
    },
  });
}

function normalizePreferredTastes(tags?: string[]): string[] {
  const map: Record<string, string> = {
    pedas: 'spicy',
    manis: 'sweet',
    asam: 'sour',
    gurih: 'savory',
  };
  return (tags ?? []).map((t) => map[t.toLowerCase()] || t);
}

async function savePreference(
  prisma: PrismaService,
  userId: string,
  data: {
    allergies?: string[];
    preferredSensory?: string[];
    preferredTastes?: string[];
  },
): Promise<void> {
  const existing = await prisma.userPreference.findUnique({
    where: { userId },
  });

  if (existing) {
    await prisma.userPreference.update({
      where: { userId },
      data: {
        ...(data.allergies !== undefined ? { allergies: data.allergies } : {}),
        ...(data.preferredSensory !== undefined
          ? { preferredSensory: data.preferredSensory }
          : {}),
        ...(data.preferredTastes !== undefined
          ? { preferredTastes: data.preferredTastes }
          : {}),
      },
    });
  } else {
    await prisma.userPreference.create({
      data: {
        userId,
        allergies: data.allergies ?? [],
        preferredSensory: data.preferredSensory ?? [],
        preferredTastes: data.preferredTastes ?? [],
      },
    });
  }
}
