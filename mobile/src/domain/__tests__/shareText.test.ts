import { createRestaurantShareText } from '../shareText';
import type { RestaurantSummary } from '../restaurantSummary';

describe('createRestaurantShareText', () => {
  it('formats a scored summary with the first non-empty newest-first visit note', () => {
    const summary: RestaurantSummary = {
      restaurant: { id: 'restaurant-1', name: '테스트 식당', createdAt: '2026-08-02' },
      visitCount: 2,
      score: 4.25,
      recentChange: null,
      menus: [],
      visits: [
        {
          visit: {
            id: 'visit-new',
            restaurantId: 'restaurant-1',
            visitedAt: '2026-08-02',
            service: 5,
            atmosphere: 5,
            note: '   ',
            photoUris: [],
          },
          menuRatings: [],
          score: 5,
        },
        {
          visit: {
            id: 'visit-old',
            restaurantId: 'restaurant-1',
            visitedAt: '2026-08-01',
            service: 4,
            atmosphere: 4,
            note: '  다시 먹고 싶은 비빔밥  ',
            photoUris: [],
          },
          menuRatings: [],
          score: 4,
        },
      ],
    };

    expect(createRestaurantShareText(summary)).toBe([
      'MYCHELIN GUIDE',
      '테스트 식당',
      '개인 점수 4.3',
      '방문 2회',
      '한줄평: 다시 먹고 싶은 비빔밥',
    ].join('\n'));
  });

  it('formats an unscored summary', () => {
    const unscored: RestaurantSummary = {
      restaurant: { id: 'restaurant-2', name: '평가 전 식당', createdAt: '2026-08-02' },
      visitCount: 0,
      score: null,
      recentChange: null,
      menus: [],
      visits: [],
    };

    expect(createRestaurantShareText(unscored)).toBe([
      'MYCHELIN GUIDE',
      '평가 전 식당',
      '평가 전',
      '방문 0회',
    ].join('\n'));
  });

  it('omits a one-line review when every visit note is absent or whitespace without mutating visits', () => {
    const summary: RestaurantSummary = {
      restaurant: { id: 'restaurant-3', name: '메모 없는 식당', createdAt: '2026-08-02' },
      visitCount: 2,
      score: 3.5,
      recentChange: null,
      menus: [],
      visits: [
        {
          visit: {
            id: 'visit-new',
            restaurantId: 'restaurant-3',
            visitedAt: '2026-08-02',
            service: 4,
            atmosphere: 4,
            photoUris: [],
          },
          menuRatings: [],
          score: 4,
        },
        {
          visit: {
            id: 'visit-old',
            restaurantId: 'restaurant-3',
            visitedAt: '2026-08-01',
            service: 3,
            atmosphere: 3,
            note: '   ',
            photoUris: [],
          },
          menuRatings: [],
          score: 3,
        },
      ],
    };
    const original = structuredClone(summary);

    expect(createRestaurantShareText(summary)).toBe([
      'MYCHELIN GUIDE',
      '메모 없는 식당',
      '개인 점수 3.5',
      '방문 2회',
    ].join('\n'));
    expect(summary).toEqual(original);
  });
});
