import type { AppData, Restaurant } from './appData';
import { parseIsoDate } from './scoring';

export function searchRestaurants(data: AppData, query: string): Restaurant[] {
  const newestVisits = new Map<string, number>();
  data.visits.forEach(({ restaurantId, visitedAt }) => {
    const timestamp = parseIsoDate(visitedAt);
    const previousVisit = newestVisits.get(restaurantId);
    if (previousVisit === undefined || timestamp > previousVisit) {
      newestVisits.set(restaurantId, timestamp);
    }
  });

  const needle = query.trim().toLocaleLowerCase();
  const newestVisit = (restaurantId: string) =>
    newestVisits.get(restaurantId) ?? Number.NEGATIVE_INFINITY;

  return [...data.restaurants]
    .filter(({ name }) => name.toLocaleLowerCase().includes(needle))
    .sort(
      (left, right) =>
        newestVisit(right.id) - newestVisit(left.id) ||
        parseIsoDate(right.createdAt) - parseIsoDate(left.createdAt),
    );
}
