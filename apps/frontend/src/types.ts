export type SafetyStatus = 'safe' | 'unsafe';

export type Menu = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  cluster: string;
  restaurant: string;
  tags: string[];
  allergens: string[];
  ingredients: string[];
  hiddenIngredients: string[];
  sensoryProfile: string[];
  crossContaminationRisk?: string | null;
  calories: number | null;
  rating: number;
  reviewCount: number;
  prepMinutes: number;
  priceStatus?: string;
  sourceUrl?: string;
  safetyStatus: SafetyStatus;
  matchScore: number;
  matchedSensory: string[];
  recommendationReason?: string;
  reason?: string;
};

export type Preferences = {
  allergies: string[];
  diet: string | null;
  dislikedTags: string[];
  hasPreferences: boolean;
};

export type MenuResponse = {
  safe: Menu[];
  unsafe: Menu[];
  summary: string;
};
