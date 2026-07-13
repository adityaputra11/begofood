export type MatchScoreItem = {
  allergens: string[];
  tags: string[];
  sensoryProfile: string[];
};

export type MatchScorePreferences = {
  allergies: string[];
  preferredSensory: string[];
  preferredTastes: string[];
};

export function calculateMenuMatchScore(
  item: MatchScoreItem,
  preferences: MatchScorePreferences,
): number {
  const { allergies, preferredSensory, preferredTastes } = preferences;

  if (allergies.some((allergen) => item.allergens.includes(allergen))) {
    return 0;
  }

  const sensoryScore = preferredSensory.some((value) =>
    item.sensoryProfile.includes(value),
  )
    ? 20
    : 0;
  const tasteScore = preferredTastes.some((tag) => item.tags.includes(tag))
    ? 20
    : 0;

  return 60 + sensoryScore + tasteScore;
}
