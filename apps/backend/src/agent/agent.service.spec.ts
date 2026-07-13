import { calculateMenuMatchScore } from './match-score';

describe('AgentService match score', () => {
  const menu = {
    allergens: [],
    tags: ['spicy'],
    sensoryProfile: ['renyah', 'hangat'],
  };

  it('returns 0 when an allergen conflicts', () => {
    expect(
      calculateMenuMatchScore(
        { ...menu, allergens: ['kacang'] },
        {
          allergies: ['kacang'],
          preferredSensory: ['renyah'],
          preferredTastes: ['spicy'],
        },
      ),
    ).toBe(0);
  });

  it('returns the safety base for a safe menu without sensory preferences', () => {
    expect(
      calculateMenuMatchScore(
        menu,
        { allergies: [], preferredSensory: [], preferredTastes: [] },
      ),
    ).toBe(60);
  });

  it('reaches 100 when sensory and taste preferences both match', () => {
    expect(
      calculateMenuMatchScore(
        menu,
        {
          allergies: [],
          preferredSensory: ['renyah'],
          preferredTastes: ['spicy'],
        },
      ),
    ).toBe(100);
  });

  it('returns 80 when only one preference dimension matches', () => {
    expect(
      calculateMenuMatchScore(menu, {
        allergies: [],
        preferredSensory: ['aromatik'],
        preferredTastes: ['spicy'],
      }),
    ).toBe(80);
  });
});
