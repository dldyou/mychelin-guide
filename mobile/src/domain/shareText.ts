import type { RestaurantSummary } from './restaurantSummary';

export function createRestaurantShareText(summary: RestaurantSummary): string {
  const representativeNote = summary.visits
    .map(({ visit }) => visit.note?.trim())
    .find((note): note is string => Boolean(note));

  const lines = [
    'MYCHELIN GUIDE',
    summary.restaurant.name,
    summary.score === null ? '평가 전' : `개인 점수 ${summary.score.toFixed(1)}`,
    `방문 ${summary.visitCount}회`,
  ];
  if (representativeNote) lines.push(`한줄평: ${representativeNote}`);
  return lines.join('\n');
}
