import { DEFAULT_SCORE_POLICY, normalizePolicy } from '../scorePolicy';
import {
  calculateMenuScore,
  calculateRecentChange,
  calculateRestaurantScore,
  calculateVisitScore,
} from '../scoring';

describe('score policy', () => {
  it('normalizes menu and visit weights independently', () => {
    const normalized = normalizePolicy({
      menuTasteWeight: 7,
      menuValueWeight: 3,
      visitMenuWeight: 6,
      visitServiceWeight: 2,
      visitAtmosphereWeight: 2,
      sequenceDecay: 0.8,
    });

    expect(normalized).toEqual({
      menuTasteWeight: 0.7,
      menuValueWeight: 0.3,
      visitMenuWeight: 0.6,
      visitServiceWeight: 0.2,
      visitAtmosphereWeight: 0.2,
      sequenceDecay: 0.8,
    });
  });

  it.each([
    { menuTasteWeight: -1 },
    { menuTasteWeight: 0, menuValueWeight: 0 },
    { menuTasteWeight: Number.MAX_VALUE, menuValueWeight: Number.MAX_VALUE },
    { visitMenuWeight: 0, visitServiceWeight: 0, visitAtmosphereWeight: 0 },
    { sequenceDecay: 0 },
    { sequenceDecay: 1.01 },
  ])('rejects invalid policy values: %p', (override) => {
    expect(() => normalizePolicy({ ...DEFAULT_SCORE_POLICY, ...override })).toThrow();
  });
});

describe('scoring', () => {
  it('uses the default menu weights', () => {
    expect(calculateMenuScore(5, 1, DEFAULT_SCORE_POLICY)).toBe(4);
  });

  it('uses the supplied policy instead of hard-coded menu weights', () => {
    const policy = {
      ...DEFAULT_SCORE_POLICY,
      menuTasteWeight: 0.2,
      menuValueWeight: 0.8,
    };

    expect(calculateMenuScore(5, 1, policy)).toBe(2);
  });

  it('combines the menu average, service, and atmosphere', () => {
    expect(calculateVisitScore([5, 1], 5, 1, DEFAULT_SCORE_POLICY)).toBe(3);
  });

  it.each([
    () => calculateMenuScore(0, 5, DEFAULT_SCORE_POLICY),
    () => calculateMenuScore(5, 1.5, DEFAULT_SCORE_POLICY),
    () => calculateVisitScore([], 5, 5, DEFAULT_SCORE_POLICY),
    () => calculateVisitScore([5], 6, 5, DEFAULT_SCORE_POLICY),
  ])('rejects incomplete or out-of-range ratings', (calculate) => {
    expect(calculate).toThrow();
  });

  it('sorts visits and gives the newest visit the highest sequence weight', () => {
    const visits = [
      { score: 1, visitedAt: '2026-07-01' },
      { score: 5, visitedAt: '2026-07-30' },
    ];

    expect(calculateRestaurantScore(visits, DEFAULT_SCORE_POLICY)).toBe(3);
    expect(calculateRestaurantScore([...visits].reverse(), DEFAULT_SCORE_POLICY)).toBe(3);
  });

  it('sorts ISO timestamps by their actual instant across time zones', () => {
    const policy = { ...DEFAULT_SCORE_POLICY, sequenceDecay: 0.5 };

    expect(
      calculateRestaurantScore(
        [
          { score: 5, visitedAt: '2026-07-30T00:30:00+09:00' },
          { score: 1, visitedAt: '2026-07-29T16:00:00Z' },
        ],
        policy,
      ),
    ).toBe(2);
  });

  it.each(['not-a-date', '2026-02-30', 'July 30, 2026'])(
    'rejects an invalid or non-ISO timestamp: %s',
    (visitedAt) => {
      expect(() =>
        calculateRestaurantScore([{ score: 5, visitedAt }], DEFAULT_SCORE_POLICY),
      ).toThrow();
    },
  );

  it('returns null for an empty restaurant and the score for one visit', () => {
    expect(calculateRestaurantScore([], DEFAULT_SCORE_POLICY)).toBeNull();
    expect(
      calculateRestaurantScore(
        [{ score: 4, visitedAt: '2026-07-30' }],
        DEFAULT_SCORE_POLICY,
      ),
    ).toBe(4);
  });

  it('requires four visits before calculating recent change', () => {
    expect(
      calculateRecentChange(
        [
          { score: 5, visitedAt: '2026-07-30' },
          { score: 4, visitedAt: '2026-07-20' },
          { score: 3, visitedAt: '2026-07-10' },
        ],
        DEFAULT_SCORE_POLICY,
      ),
    ).toBeNull();
  });

  it('compares the newest three visits with the remaining visits', () => {
    expect(
      calculateRecentChange(
        [
          { score: 1, visitedAt: '2026-07-01' },
          { score: 5, visitedAt: '2026-07-10' },
          { score: 5, visitedAt: '2026-07-20' },
          { score: 5, visitedAt: '2026-07-30' },
        ],
        DEFAULT_SCORE_POLICY,
      ),
    ).toBe(4);
  });

  it('applies sequence weighting within both recent-change groups', () => {
    const policy = { ...DEFAULT_SCORE_POLICY, sequenceDecay: 0.5 };

    expect(
      calculateRecentChange(
        [
          { score: 5, visitedAt: '2026-07-01' },
          { score: 1, visitedAt: '2026-07-10' },
          { score: 5, visitedAt: '2026-07-30' },
          { score: 5, visitedAt: '2026-07-20' },
          { score: 1, visitedAt: '2026-07-25' },
        ],
        policy,
      ),
    ).toBeCloseTo(1.5238, 4);
  });
});
