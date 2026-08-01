import type { AppData } from './appData';

export type ProfileStats = {
  visitedRestaurantCount: number;
  visitCount: number;
  menuRatingCount: number;
};

export function getProfileStats(data: AppData): ProfileStats {
  const restaurantIds = new Set(data.restaurants.map(({ id }) => id));
  const visitedRestaurantIds = new Set(
    data.visits
      .map(({ restaurantId }) => restaurantId)
      .filter((restaurantId) => restaurantIds.has(restaurantId)),
  );

  return {
    visitedRestaurantCount: visitedRestaurantIds.size,
    visitCount: data.visits.length,
    menuRatingCount: data.menuRatings.length,
  };
}
