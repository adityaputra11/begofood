export type SafetyStatus = 'safe' | 'unsafe';

export type Menu = {
  id: string;
  name: string;
  description: string;
  aiDescription?: string;
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
  prepMinutes: number;
  priceStatus?: string;
  sourceUrl?: string;
  safetyStatus?: SafetyStatus;
  matchScore?: number;
  matchedSensory?: string[];
  matchedTastes?: string[];
  recommendationReason?: string;
  reason?: string;
};

export type Persona = {
  id: string;
  name: string;
  emoji: string;
  bio: string;
  preferences: {
    allergies: string[];
    preferredSensory: string[];
    preferredTastes: string[];
  };
};

export type Preferences = {
  allergies: string[];
  preferredSensory: string[];
  preferredTastes: string[];
  hasPreferences: boolean;
};

export type MenuResponse = {
  safe: Menu[];
  unsafe: Menu[];
  summary: string;
};
