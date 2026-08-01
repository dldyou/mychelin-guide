import { createEmptyAppData } from '../appData';
import { getProfileStats } from '../profileStats';

describe('getProfileStats', () => {
  it('returns zero counts for empty app data', () => {
    expect(getProfileStats(createEmptyAppData())).toEqual({
      visitedRestaurantCount: 0,
      visitCount: 0,
      menuRatingCount: 0,
    });
  });

  it('counts distinct registered restaurants and preserves raw stored totals without mutation', () => {
    const data = {
      restaurants: [
        { id: 'restaurant-a', name: 'Restaurant A', createdAt: '2026-01-01' },
        { id: 'restaurant-b', name: 'Restaurant B', createdAt: '2026-01-01' },
        { id: 'restaurant-c', name: 'Restaurant C', createdAt: '2026-01-01' },
      ],
      menus: [
        { id: 'menu-a', restaurantId: 'restaurant-a', name: 'Menu A', createdAt: '2026-01-01' },
      ],
      visits: [
        { id: 'visit-a-1', restaurantId: 'restaurant-a', visitedAt: '2026-01-01', service: 5, atmosphere: 5, photoUris: [] },
        { id: 'visit-a-2', restaurantId: 'restaurant-a', visitedAt: '2026-01-02', service: 5, atmosphere: 5, photoUris: [] },
        { id: 'visit-b', restaurantId: 'restaurant-b', visitedAt: '2026-01-03', service: 5, atmosphere: 5, photoUris: [] },
        { id: 'visit-missing', restaurantId: 'missing-restaurant', visitedAt: '2026-01-04', service: 5, atmosphere: 5, photoUris: [] },
      ],
      menuRatings: [
        { id: 'rating-1', visitId: 'visit-a-1', menuId: 'menu-a', taste: 5, value: 5 },
        { id: 'rating-2', visitId: 'visit-a-2', menuId: 'menu-a', taste: 5, value: 5 },
        { id: 'rating-3', visitId: 'visit-b', menuId: 'menu-a', taste: 5, value: 5 },
        { id: 'rating-4', visitId: 'visit-missing', menuId: 'menu-a', taste: 5, value: 5 },
      ],
    };
    const before = JSON.parse(JSON.stringify(data));

    expect(getProfileStats(data)).toEqual({
      visitedRestaurantCount: 2,
      visitCount: 4,
      menuRatingCount: 4,
    });
    expect(data).toEqual(before);
  });
});
