import type { AppData } from '../appData';
import { searchRestaurants } from '../restaurantSearch';

const data: AppData = {
  restaurants: [
    { id: 'new-unvisited', name: 'Cafe', createdAt: '2026-08-01' },
    { id: 'older-visit', name: 'Noodle Bar', createdAt: '2026-06-01' },
    { id: 'old-unvisited', name: 'Bakery', createdAt: '2026-04-01' },
    { id: 'newer-visit', name: 'House of Noodles', createdAt: '2026-01-01' },
  ],
  menus: [],
  visits: [
    {
      id: 'visit-older',
      restaurantId: 'older-visit',
      visitedAt: '2026-05-01',
      service: 4,
      atmosphere: 4,
      photoUris: [],
    },
    {
      id: 'visit-newer',
      restaurantId: 'newer-visit',
      visitedAt: '2026-07-01',
      service: 4,
      atmosphere: 4,
      photoUris: [],
    },
  ],
  menuRatings: [],
};

describe('searchRestaurants', () => {
  it('matches a trimmed query without regard to case', () => {
    expect(searchRestaurants(data, '  NOODLE  ').map(({ id }) => id)).toEqual([
      'newer-visit',
      'older-visit',
    ]);
  });

  it('returns all restaurants for an empty query', () => {
    expect(searchRestaurants(data, '')).toHaveLength(data.restaurants.length);
  });

  it('sorts by newest visit, then restaurant creation time, without mutating the input', () => {
    const originalOrder = data.restaurants.map(({ id }) => id);
    const result = searchRestaurants(data, '  ');

    expect(result.map(({ id }) => id)).toEqual([
      'newer-visit',
      'older-visit',
      'new-unvisited',
      'old-unvisited',
    ]);
    expect(result).not.toBe(data.restaurants);
    expect(data.restaurants.map(({ id }) => id)).toEqual(originalOrder);
  });

  it('sorts a pre-1970 visit ahead of a restaurant with no visits', () => {
    const historicalData: AppData = {
      restaurants: [
        { id: 'unvisited', name: 'New Cafe', createdAt: '2026-01-01' },
        { id: 'historical', name: 'Old Diner', createdAt: '1960-01-01' },
      ],
      menus: [],
      visits: [
        {
          id: 'historical-visit',
          restaurantId: 'historical',
          visitedAt: '1969-12-31',
          service: 4,
          atmosphere: 4,
          photoUris: [],
        },
      ],
      menuRatings: [],
    };

    expect(searchRestaurants(historicalData, '').map(({ id }) => id)).toEqual([
      'historical',
      'unvisited',
    ]);
  });

  it('uses the newest of multiple visits when ordering restaurants', () => {
    const multipleVisitsData: AppData = {
      restaurants: [
        { id: 'repeat', name: 'Repeat Cafe', createdAt: '2026-01-01' },
        { id: 'single', name: 'Single Cafe', createdAt: '2026-01-01' },
      ],
      menus: [],
      visits: [
        {
          id: 'repeat-newest',
          restaurantId: 'repeat',
          visitedAt: '2026-08-01',
          service: 4,
          atmosphere: 4,
          photoUris: [],
        },
        {
          id: 'single-visit',
          restaurantId: 'single',
          visitedAt: '2026-07-01',
          service: 4,
          atmosphere: 4,
          photoUris: [],
        },
        {
          id: 'repeat-older',
          restaurantId: 'repeat',
          visitedAt: '2026-01-01',
          service: 4,
          atmosphere: 4,
          photoUris: [],
        },
      ],
      menuRatings: [],
    };

    expect(searchRestaurants(multipleVisitsData, '').map(({ id }) => id)).toEqual([
      'repeat',
      'single',
    ]);
  });
});
