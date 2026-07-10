import { FunctionTool } from '@google/adk';
import type { PrismaService } from '../../prisma/prisma.service.js';

export function createGetPreferenceTool(prisma: PrismaService): FunctionTool {
  return new FunctionTool({
    name: 'get_preference',
    description: `Ambil preferensi pengguna (alergi & diet) yang sudah tersimpan.
Gunakan tool ini untuk mengecek preferensi user sebelum memberikan rekomendasi menu.`,
    execute: async (_input, toolContext) => {
      const userId = toolContext?.userId;
      if (!userId) {
        return {
          allergies: [],
          diet: null,
          message: 'User ID tidak ditemukan.',
        };
      }

      const pref = await prisma.userPreference.findUnique({
        where: { userId },
      });

      return {
        allergies: pref?.allergies ?? [],
        diet: pref?.diet ?? null,
        hasPreferences: !!pref,
      };
    },
  });
}
