import { DEFAULT_SCORE_POLICY } from '../scorePolicy';
import {
  getRecentRestaurantSummaries,
  getRestaurantSummaries,
  getRestaurantSummary,
  sortRestaurantSummaries,
} from '../restaurantSummary';
import type { RestaurantSummary } from '../restaurantSummary';
import type { AppData } from '../appData';

const data: AppData = {
  restaurants: [
    { id: 'restaurant-1', name: 'Restaurant One', createdAt: '2026-01-01' },
  ],
  menus: [
    { id: 'menu-1', restaurantId: 'restaurant-1', name: 'Main', createdAt: '2026-01-01' },
    { id: 'menu-2', restaurantId: 'restaurant-1', name: 'Dessert', createdAt: '2026-01-01' },
  ],
  visits: [
    {
      id: 'visit-old',
      restaurantId: 'restaurant-1',
      visitedAt: '2026-07-01',
      service: 1,
      atmosphere: 1,
      photoUris: [],
    },
    {
      id: 'visit-new',
      restaurantId: 'restaurant-1',
      visitedAt: '2026-07-30',
      service: 5,
      atmosphere: 5,
      photoUris: [],
    },
  ],
  menuRatings: [
    { id: 'rating-new', visitId: 'visit-new', menuId: 'menu-1', taste: 5, value: 5 },
    { id: 'rating-old-main', visitId: 'visit-old', menuId: 'menu-1', taste: 5, value: 3 },
    { id: 'rating-old-dessert', visitId: 'visit-old', menuId: 'menu-2', taste: 1, value: 1 },
  ],
};

describe('getRestaurantSummary', () => {
  it('joins restaurant records and uses the supplied scoring policy', () => {
    const policy = { ...DEFAULT_SCORE_POLICY, sequenceDecay: 0.5 };
    const summary = getRestaurantSummary('restaurant-1', data, policy);

    expect(summary).not.toBeNull();
    expect(summary?.visitCount).toBe(2);
    expect(summary?.visits.map(({ visit }) => visit.id)).toEqual(['visit-new', 'visit-old']);
    expect(summary?.visits.map(({ score }) => score)).toEqual([5, 2]);
    expect(summary?.score).toBe(4);
  });

  it('summarizes every restaurant menu by its literal average score', () => {
    const summary = getRestaurantSummary('restaurant-1', data, DEFAULT_SCORE_POLICY);

    expect(summary?.menus).toEqual([
      expect.objectContaining({
        menu: expect.objectContaining({ id: 'menu-1' }),
        ratingCount: 2,
        score: 4.5,
      }),
      expect.objectContaining({
        menu: expect.objectContaining({ id: 'menu-2' }),
        ratingCount: 1,
        score: 1,
      }),
    ]);
  });

  it('returns an unscored existing restaurant with no visits and null for a missing restaurant', () => {
    const emptyData: AppData = {
      ...data,
      restaurants: [
        ...data.restaurants,
        { id: 'restaurant-empty', name: 'Empty', createdAt: '2026-01-01' },
      ],
    };

    expect(getRestaurantSummary('restaurant-empty', emptyData, DEFAULT_SCORE_POLICY)).toEqual(
      expect.objectContaining({
        visitCount: 0,
        score: null,
        recentChange: null,
        visits: [],
        menus: [],
      }),
    );
    expect(getRestaurantSummary('missing', data, DEFAULT_SCORE_POLICY)).toBeNull();
  });

  it('skips broken rating references while retaining an unscored valid visit', () => {
    const summary = getRestaurantSummary(
      'restaurant-1',
      {
        ...data,
        visits: [
          ...data.visits,
          {
            id: 'visit-unrated',
            restaurantId: 'restaurant-1',
            visitedAt: '2026-08-01',
            service: 5,
            atmosphere: 5,
            photoUris: [],
          },
        ],
        menuRatings: [
          ...data.menuRatings,
          { id: 'missing-menu', visitId: 'visit-new', menuId: 'none', taste: 5, value: 5 },
          { id: 'missing-visit', visitId: 'none', menuId: 'menu-1', taste: 5, value: 5 },
        ],
      },
      DEFAULT_SCORE_POLICY,
    );

    expect(summary?.visitCount).toBe(3);
    expect(summary?.visits.map(({ visit, score }) => [visit.id, score])).toEqual([
      ['visit-unrated', null],
      ['visit-new', 5],
      ['visit-old', 2],
    ]);
    expect(summary?.visits.find(({ visit }) => visit.id === 'visit-new')?.menuRatings).toEqual([
      expect.objectContaining({ rating: expect.objectContaining({ id: 'rating-new' }) }),
    ]);
    expect(summary?.menus.map(({ menu, ratingCount }) => [menu.id, ratingCount])).toEqual([
      ['menu-1', 2],
      ['menu-2', 1],
    ]);
    expect(summary?.score).toBe(4);
  });

  it('orders rated menus by score, name, and ID before unrated menus', () => {
    const summary = getRestaurantSummary(
      'restaurant-menus',
      {
        restaurants: [
          { id: 'restaurant-menus', name: 'Menus', createdAt: '2026-01-01' },
        ],
        menus: [
          { id: 'menu-beta', restaurantId: 'restaurant-menus', name: 'Beta', createdAt: '2026-01-01' },
          { id: 'menu-unrated-z', restaurantId: 'restaurant-menus', name: 'Zulu', createdAt: '2026-01-01' },
          { id: 'menu-unrated', restaurantId: 'restaurant-menus', name: 'Aardvark', createdAt: '2026-01-01' },
          { id: 'menu-high', restaurantId: 'restaurant-menus', name: 'Zebra', createdAt: '2026-01-01' },
          { id: 'menu-alpha', restaurantId: 'restaurant-menus', name: 'Alpha', createdAt: '2026-01-01' },
        ],
        visits: [
          {
            id: 'visit-1',
            restaurantId: 'restaurant-menus',
            visitedAt: '2026-01-01',
            service: 5,
            atmosphere: 5,
            photoUris: [],
          },
        ],
        menuRatings: [
          { id: 'rating-beta', visitId: 'visit-1', menuId: 'menu-beta', taste: 4, value: 4 },
          { id: 'rating-high', visitId: 'visit-1', menuId: 'menu-high', taste: 5, value: 5 },
          { id: 'rating-alpha', visitId: 'visit-1', menuId: 'menu-alpha', taste: 4, value: 4 },
        ],
      },
      DEFAULT_SCORE_POLICY,
    );

    expect(summary?.menus.map(({ menu }) => menu.id)).toEqual([
      'menu-high',
      'menu-alpha',
      'menu-beta',
      'menu-unrated',
      'menu-unrated-z',
    ]);
  });

  it('reports the literal weighted difference between four scored visits', () => {
    const summary = getRestaurantSummary(
      'restaurant-change',
      {
        restaurants: [
          { id: 'restaurant-change', name: 'Change', createdAt: '2026-01-01' },
        ],
        menus: [{ id: 'menu-1', restaurantId: 'restaurant-change', name: 'Only', createdAt: '2026-01-01' }],
        visits: [
          { id: 'visit-1', restaurantId: 'restaurant-change', visitedAt: '2026-01-01', service: 1, atmosphere: 1, photoUris: [] },
          { id: 'visit-2', restaurantId: 'restaurant-change', visitedAt: '2026-01-02', service: 2, atmosphere: 2, photoUris: [] },
          { id: 'visit-3', restaurantId: 'restaurant-change', visitedAt: '2026-01-03', service: 3, atmosphere: 3, photoUris: [] },
          { id: 'visit-4', restaurantId: 'restaurant-change', visitedAt: '2026-01-04', service: 5, atmosphere: 5, photoUris: [] },
        ],
        menuRatings: [
          { id: 'rating-1', visitId: 'visit-1', menuId: 'menu-1', taste: 1, value: 1 },
          { id: 'rating-2', visitId: 'visit-2', menuId: 'menu-1', taste: 2, value: 2 },
          { id: 'rating-3', visitId: 'visit-3', menuId: 'menu-1', taste: 3, value: 3 },
          { id: 'rating-4', visitId: 'visit-4', menuId: 'menu-1', taste: 5, value: 5 },
        ],
      },
      { ...DEFAULT_SCORE_POLICY, sequenceDecay: 0.5 },
    );

    expect(summary?.recentChange).toBe(3);
  });
});

const summary = (
  id: string,
  name: string,
  score: number | null,
  visitCount: number,
  visitedAt?: string,
): RestaurantSummary => ({
  restaurant: { id, name, createdAt: '2026-01-01' },
  visitCount,
  score,
  recentChange: null,
  menus: [],
  visits: visitedAt
    ? [
        {
          visit: {
            id: `visit-${id}`,
            restaurantId: id,
            visitedAt,
            service: 5,
            atmosphere: 5,
            photoUris: [],
          },
          menuRatings: [],
          score,
        },
      ]
    : [],
});

const restaurantIds = (items: RestaurantSummary[]) => items.map(({ restaurant }) => restaurant.id);

describe('restaurant summary collections', () => {
  it('builds a summary for every restaurant', () => {
    expect(restaurantIds(getRestaurantSummaries(data, DEFAULT_SCORE_POLICY))).toEqual([
      'restaurant-1',
    ]);
  });

  it('sorts score and visit collections deterministically without mutating input', () => {
    const byScore = [
      summary('unscored', 'Unscored', null, 1),
      summary('same-score-b', 'Same B', 4, 2),
      summary('high-score', 'High', 5, 3),
      summary('same-score-a', 'Same A', 4, 2),
    ];
    const byVisits = [
      summary('never-visited', 'Never', null, 0),
      summary('same-count-b', 'Same B', 3, 2),
      summary('frequent', 'Frequent', 1, 5),
      summary('same-count-a', 'Same A', 4, 2),
    ];

    expect(restaurantIds(sortRestaurantSummaries(byScore, 'score'))).toEqual([
      'high-score',
      'same-score-a',
      'same-score-b',
      'unscored',
    ]);
    expect(restaurantIds(sortRestaurantSummaries(byVisits, 'visits'))).toEqual([
      'frequent',
      'same-count-a',
      'same-count-b',
      'never-visited',
    ]);
    expect(restaurantIds(byScore)).toEqual([
      'unscored',
      'same-score-b',
      'high-score',
      'same-score-a',
    ]);
    expect(restaurantIds(byVisits)).toEqual([
      'never-visited',
      'same-count-b',
      'frequent',
      'same-count-a',
    ]);
  });

  it('returns the newest visited restaurants by ISO instant without mutating input', () => {
    const summaries = [
      summary('never-visited', 'Never', null, 0),
      summary('oldest', 'Oldest', 2, 1, '2026-07-28T16:00:00Z'),
      summary('middle', 'Middle', 3, 1, '2026-07-30T00:30:00+09:00'),
      summary('newest', 'Newest', 4, 1, '2026-07-29T16:00:00Z'),
      summary('fourth', 'Fourth', 5, 1, '2026-07-28T20:00:00Z'),
    ];

    expect(restaurantIds(getRecentRestaurantSummaries(summaries))).toEqual([
      'newest',
      'middle',
      'fourth',
    ]);
    expect(restaurantIds(getRecentRestaurantSummaries(summaries, 2))).toEqual([
      'newest',
      'middle',
    ]);
    expect(restaurantIds(summaries)).toEqual([
      'never-visited',
      'oldest',
      'middle',
      'newest',
      'fourth',
    ]);
  });
});
