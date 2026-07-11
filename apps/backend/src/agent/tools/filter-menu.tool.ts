import { z } from 'zod';
import { FunctionTool } from '@google/adk';
import type { PrismaService } from '../../prisma/prisma.service.js';

export function createFilterMenuTool(prisma: PrismaService): FunctionTool {
  return new FunctionTool({
    name: 'filter_menu',
    description: `Filter menu items berdasarkan alergi, preferensi diet, kategori, atau kata kunci.
Panggil tool ini ketika user ingin:
- Melihat menu yang aman untuk alerginya
- Mencari makanan sesuai diet (low_carb, vegan, halal, dll)
- Mengetahui makanan mana yang mengandung alergen tertentu
- Mencari menu berdasarkan kategori atau kata kunci`,
    parameters: z.object({
      allergies: z
        .array(z.string())
        .optional()
        .describe(
          'Daftar alergen yang harus dihindari. Contoh: ["kacang", "susu", "gluten", "telur", "seafood", "kedelai", "wijen"]',
        ),
      diet: z
        .string()
        .optional()
        .describe(
          'Preferensi diet. Contoh: "vegetarian", "vegan", "low_carb", "halal", "high_protein"',
        ),
      category: z
        .string()
        .optional()
        .describe(
          'Kategori menu. Contoh: "main_course", "dessert", "beverage", "snack", "appetizer"',
        ),
      search: z.string().optional().describe('Kata kunci pencarian nama menu'),
      sensory: z
        .array(z.string())
        .optional()
        .describe('Karakter sensoris, misalnya renyah, hangat, gurih, smoky'),
      cluster: z
        .enum(['western_indonesian', 'chinese_food', 'seafood'])
        .optional()
        .describe('Klaster restoran pada dataset penelitian'),
    }),
    execute: async ({
      allergies,
      diet,
      category,
      search,
      sensory,
      cluster,
    }) => {
      const safeWhere: Record<string, unknown> = {
        isAvailable: true,
        ...(allergies && allergies.length > 0
          ? { NOT: { allergens: { hasSome: allergies } } }
          : {}),
        ...(diet ? { tags: { has: diet } } : {}),
        ...(category ? { category } : {}),
        ...(cluster ? { cluster } : {}),
        ...(sensory?.length ? { sensoryProfile: { hasSome: sensory } } : {}),
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
