import { z } from 'zod';
import { FunctionTool } from '@google/adk';
import type { PrismaService } from '../../prisma/prisma.service.js';

export function createFilterMenuTool(prisma: PrismaService): FunctionTool {
  return new FunctionTool({
    name: 'filter_menu',
    description: `Filter menu berdasarkan alergi, kategori, karakter sensoris, cita rasa, atau kata kunci.
Panggil tool ini ketika user ingin:
- Melihat menu yang aman untuk alerginya
- Mengetahui makanan mana yang mengandung alergen tertentu
- Mencari menu berdasarkan kategori, cita rasa, atau kata kunci`,
    parameters: z.object({
      allergies: z
        .array(z.string())
        .optional()
        .describe(
          'Daftar alergen yang harus dihindari. Contoh: ["kacang", "susu", "telur", "seafood"]',
        ),
      category: z
        .string()
        .optional()
        .describe(
          'Kategori menu. Contoh: "main_course", "dessert", "beverage", "snack", "appetizer"',
        ),
      search: z.string().optional().describe('Kata kunci pencarian nama menu'),
      taste: z
        .array(z.string())
        .optional()
        .describe('Tag cita rasa: spicy, savory, sweet, atau sour'),
      sensory: z
        .array(z.enum(['renyah', 'lembut', 'hangat', 'aromatik']))
        .optional()
        .describe('Karakter sensoris: renyah, lembut, hangat, atau aromatik'),
      cluster: z
        .enum(['western_indonesian', 'chinese_food', 'seafood'])
        .optional()
        .describe('Klaster restoran pada dataset penelitian'),
    }),
    execute: async ({
      allergies,
      category,
      search,
      taste,
      sensory,
      cluster,
    }) => {
      const safeWhere: Record<string, unknown> = {
        isAvailable: true,
        ...(allergies && allergies.length > 0
          ? { NOT: { allergens: { hasSome: allergies } } }
          : {}),
        ...(category ? { category } : {}),
        ...(cluster ? { cluster } : {}),
        ...(taste?.length ? { tags: { hasSome: taste } } : {}),
        ...(sensory?.length
          ? { sensoryProfile: { hasSome: sensory } }
          : {}),
        ...(search
          ? { name: { contains: search, mode: 'insensitive' as const } }
          : {}),
      };

      const safeItems = await prisma.menu.findMany({
        where: safeWhere,
        orderBy: { name: 'asc' },
      });

      const unsafeItems = allergies?.length
        ? await prisma.menu.findMany({
            where: {
              isAvailable: true,
              allergens: { hasSome: allergies },
              ...(category ? { category } : {}),
              ...(cluster ? { cluster } : {}),
              ...(search
                ? { name: { contains: search, mode: 'insensitive' as const } }
                : {}),
            },
            orderBy: { name: 'asc' },
          })
        : [];

      return {
        safe: safeItems,
        unsafe: unsafeItems,
        summary: `${safeItems.length} menu aman, ${unsafeItems.length} menu mengandung alergen`,
      };
    },
  });
}
