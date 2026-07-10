import { z } from 'zod';

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

export const VALIDATION_SCHEMA = z.object({
  valid: z.boolean(),
  allergies: z.array(z.string()),
  diet: z.string().nullable(),
  unknownAllergies: z.array(z.string()),
  unknownDiet: z.string().nullable(),
  message: z.string(),
});

export type ValidationResult = z.infer<typeof VALIDATION_SCHEMA>;

export const PREFERENCE_VALIDATION_CONFIG = {
  name: 'preference_validator',
  instruction: `Kamu adalah validator preferensi makanan untuk Begofood.

Tugasmu: Validasi input alergi & diet dari user.

Valid allergens: ${VALID_ALLERGENS.join(', ')} (bisa juga bahasa Indonesia: kacang tanah, udang, cumi, dll)
Valid diets: ${VALID_DIETS.join(', ')}

Aturan:
1. Cocokkan input user dengan daftar valid di atas
2. Alergi bersifat case-insensitive dan toleran terhadap typo ringan
   Contoh: "kacang tanah" → "kacang", "seafood" → "seafood"
3. Diet bersifat case-insensitive
   Contoh: "low carb" → "low_carb", "vegetarian" → "vegetarian"
4. Jika ada yang tidak valid, catat di unknownAllergies / unknownDiet
5. Berikan message yang jelas dalam Bahasa Indonesia

Output JSON:
{
  "valid": true/false,
  "allergies": ["kacang"],
  "diet": "low_carb",
  "unknownAllergies": ["blahblah"],
  "unknownDiet": null,
  "message": "Preferensi valid" / "Kacang tersimpan. 'blahblah' tidak dikenal."
}`,
  outputSchema: VALIDATION_SCHEMA,
};
