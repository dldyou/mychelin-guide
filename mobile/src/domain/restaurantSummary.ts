import {
  calculateMenuScore,
  calculateRecentChange,
  calculateRestaurantScore,
  calculateVisitScore,
  parseIsoDate,
} from './scoring';
import type { AppData, Menu, MenuRating, Restaurant, Visit } from './appData';
import type { ScorePolicy } from './types';

export type MenuRatingSummary = {
  rating: MenuRating;
  menu: Menu;
  score: number;
};

export type VisitSummary = {
  visit: Visit;
  menuRatings: MenuRatingSummary[];
  score: number | null;
};

export type MenuSummary = {
  menu: Menu;
  ratingCount: number;
  score: number | null;
};

export type RestaurantSummary = {
  restaurant: Restaurant;
  visitCount: number;
  score: number | null;
  recentChange: number | null;
  menus: MenuSummary[];
  visits: VisitSummary[];
};

export type RestaurantSummarySort = 'score' | 'visits';
export type RestaurantStatusFilter = 'all' | 'want-to-visit' | 'visited';

export function getRestaurantSummary(
  restaurantId: string,
  data: AppData,
  policy: ScorePolicy,
): RestaurantSummary | null {
  const restaurant = data.restaurants.find(({ id }) => id === restaurantId);
  if (!restaurant) return null;

  const restaurantMenus = data.menus.filter((menu) => menu.restaurantId === restaurantId);
  const menusById = new Map(restaurantMenus.map((menu) => [menu.id, menu]));
  const restaurantVisits = data.visits.filter((visit) => visit.restaurantId === restaurantId);
  const visitsById = new Map(restaurantVisits.map((visit) => [visit.id, visit]));
  const ratingsByVisitId = new Map<string, MenuRatingSummary[]>();
  const ratingsByMenuId = new Map<string, MenuRatingSummary[]>();

  data.menuRatings.forEach((rating) => {
    const menu = menusById.get(rating.menuId);
    const visit = visitsById.get(rating.visitId);
    if (!menu || !visit) return;

    const ratingSummary = { rating, menu, score: calculateMenuScore(rating.taste, rating.value, policy) };
    const visitMenuRatings = ratingsByVisitId.get(visit.id) ?? [];
    visitMenuRatings.push(ratingSummary);
    ratingsByVisitId.set(visit.id, visitMenuRatings);
    const menuRatings = ratingsByMenuId.get(menu.id) ?? [];
    menuRatings.push(ratingSummary);
    ratingsByMenuId.set(menu.id, menuRatings);
  });

  const visits = restaurantVisits
    .map((visit) => {
      const menuRatings = ratingsByVisitId.get(visit.id) ?? [];
      return {
        visit,
        menuRatings,
        score:
          menuRatings.length === 0
            ? null
            : calculateVisitScore(
                menuRatings.map(({ score }) => score),
                visit.service,
                visit.atmosphere,
                policy,
              ),
      };
    })
    .sort((left, right) => parseIsoDate(right.visit.visitedAt) - parseIsoDate(left.visit.visitedAt));
  const scoredVisits = visits.flatMap(({ visit, score }) =>
    score === null ? [] : [{ score, visitedAt: visit.visitedAt }],
  );
  const menus = restaurantMenus
    .map((menu) => {
      const menuRatings = ratingsByMenuId.get(menu.id) ?? [];
      return {
        menu,
        ratingCount: menuRatings.length,
        score:
          menuRatings.length === 0
            ? null
            : menuRatings.reduce((total, { score }) => total + score, 0) / menuRatings.length,
      };
    })
    .sort((left, right) => {
      if (left.score === null) {
        return right.score === null
          ? left.menu.name.localeCompare(right.menu.name) || left.menu.id.localeCompare(right.menu.id)
          : 1;
      }
      if (right.score === null) return -1;
      return (
        right.score - left.score ||
        left.menu.name.localeCompare(right.menu.name) ||
        left.menu.id.localeCompare(right.menu.id)
      );
    });

  return {
    restaurant,
    visitCount: restaurantVisits.length,
    score: calculateRestaurantScore(scoredVisits, policy),
    recentChange: calculateRecentChange(scoredVisits, policy),
    menus,
    visits,
  };
}

export function getRestaurantSummaries(data: AppData, policy: ScorePolicy): RestaurantSummary[] {
  return data.restaurants.flatMap((restaurant) => {
    const summary = getRestaurantSummary(restaurant.id, data, policy);
    return summary ? [summary] : [];
  });
}

function compareRestaurantIdentity(left: RestaurantSummary, right: RestaurantSummary) {
  return (
    left.restaurant.name.localeCompare(right.restaurant.name) ||
    left.restaurant.id.localeCompare(right.restaurant.id)
  );
}

export function sortRestaurantSummaries(
  summaries: RestaurantSummary[],
  sort: RestaurantSummarySort,
): RestaurantSummary[] {
  return [...summaries].sort((left, right) => {
    if (sort === 'score') {
      if (left.score === null) return right.score === null ? compareRestaurantIdentity(left, right) : 1;
      if (right.score === null) return -1;
      return right.score - left.score || compareRestaurantIdentity(left, right);
    }

    return right.visitCount - left.visitCount || compareRestaurantIdentity(left, right);
  });
}

export function filterRestaurantSummaries(
  summaries: RestaurantSummary[],
  { query, category, status }: { query: string; category: string; status: RestaurantStatusFilter },
): RestaurantSummary[] {
  const nameNeedle = query.trim().toLocaleLowerCase();
  const categoryNeedle = category.trim().toLocaleLowerCase();

  return summaries.filter((summary) =>
    summary.restaurant.name.toLocaleLowerCase().includes(nameNeedle)
    && (summary.restaurant.category ?? '').toLocaleLowerCase().includes(categoryNeedle)
    && (status === 'all' || (status === 'visited' ? summary.visitCount > 0 : summary.visitCount === 0)),
  );
}

export function getRecentRestaurantSummaries(
  summaries: RestaurantSummary[],
  limit = 3,
): RestaurantSummary[] {
  return summaries
    .filter(({ visits }) => visits.length > 0)
    .sort((left, right) => {
      const newestLeft = Math.max(...left.visits.map(({ visit }) => parseIsoDate(visit.visitedAt)));
      const newestRight = Math.max(...right.visits.map(({ visit }) => parseIsoDate(visit.visitedAt)));
      return newestRight - newestLeft || compareRestaurantIdentity(left, right);
    })
    .slice(0, limit);
}
