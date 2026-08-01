import type { AppData, Restaurant } from './appData';
import { parseIsoDate } from './scoring';

export function searchRestaurants(data: AppData, query: string): Restaurant[] {
  const newestVisits = new Map<string, number>();
  data.visits.forEach(({ restaurantId, visitedAt }) => {
    const timestamp = parseIsoDate(visitedAt);
    if (timestamp > (newestVisits.get(restaurantId) ?? 0)) {
      newestVisits.set(restaurantId, timestamp);
    }
  });

  const needle = query.trim().toLocaleLowerCase();
  const newestVisit = (restaurantId: string) => newestVisits.get(restaurantId) ?? 0;

  return [...data.restaurants]
    .filter(({ name }) => name.toLocaleLowerCase().includes(needle))
    .sort(
      (left, right) =>
        newestVisit(right.id) - newestVisit(left.id) ||
        parseIsoDate(right.createdAt) - parseIsoDate(left.createdAt),
    );
}
