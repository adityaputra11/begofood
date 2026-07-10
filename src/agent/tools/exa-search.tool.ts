import { z } from 'zod';
import { FunctionTool } from '@google/adk';
import Exa from 'exa-js';

let exaClient: Exa | null = null;

function getClient(): Exa {
  if (!exaClient) {
    const key = process.env.EXA_API_KEY;
    if (!key) throw new Error('EXA_API_KEY tidak ditemukan di .env');
    exaClient = new Exa(key);
  }
  return exaClient;
}

export function createExaSearchTool(): FunctionTool {
  return new FunctionTool({
    name: 'exa_search',
    description: `Cari informasi dari web menggunakan Exa Search Engine.
Gunakan tool ini ketika user bertanya tentang:
- Resep masakan yang tidak kamu ketahui
- Informasi bahan makanan (misal: "apa itu terasi?", "gluten free apa aja?")
- Fakta kuliner atau nutrisi
- Berita terbaru seputar makanan
- Konfirmasi apakah suatu bahan mengandung alergen tertentu`,
    parameters: z.object({
      query: z.string().describe('Kata kunci pencarian'),
      maxResults: z
        .number()
        .optional()
        .describe('Jumlah hasil maksimal (default: 5)'),
    }),
    execute: async ({ query, maxResults }) => {
      const exa = getClient();

      const result = await exa.search(query, {
        contents: { text: { maxCharacters: 5000 } },
        ...(maxResults ? { numResults: maxResults } : {}),
      });

      const results = (result as any).results || [];

      return {
        query,
        results: results.map((r: any) => ({
          title: r.title || '',
          url: r.url || '',
          text: r.text || '',
        })),
        totalResults: results.length,
      };
    },
  });
}
