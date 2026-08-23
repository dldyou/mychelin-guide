import { getRestaurantSummary } from '../restaurantSummary';
import { DEFAULT_SCORE_POLICY } from '../scorePolicy';
import { parseIsoDate } from '../scoring';
import {
  formatVisitDate,
  localDateInputValue,
  replaceVisitDate,
  visitDateInputValue,
} from '../visitDate';

describe('visit dates', () => {
  test('uses a local calendar date as the input default and displays it readably', () => {
    const date = new Date(2024, 1, 29, 23, 30);

    expect(localDateInputValue(date)).toBe('2024-02-29');
    expect(visitDateInputValue('2024-02-29')).toBe('2024-02-29');
    expect(formatVisitDate('2024-02-29')).toBe('2024년 2월 29일');
  });

  test('replaces only the calendar date and preserves an existing time and offset', () => {
    expect(replaceVisitDate('2026-08-20', '2025-01-02')).toBe('2025-01-02');
  });

  test.each([
    '2026-08-20T23:34:56.789Z',
    '2026-08-20T00:34:56.789+14:00',
  ])('uses one device-local calendar date for timestamp display and editing: %s', (visitedAt) => {
    const shownDate = visitDateInputValue(visitedAt);
    const editedDate = '2025-01-02';
    const replaced = replaceVisitDate(visitedAt, editedDate);

    expect(shownDate).toBe(localDateInputValue(new Date(parseIsoDate(visitedAt))));
    expect(formatVisitDate(visitedAt)).toBe(formatVisitDate(shownDate));
    expect(replaceVisitDate(visitedAt, shownDate)).toBe(visitedAt);
    expect(visitDateInputValue(replaced)).toBe(editedDate);
    expect(replaced.slice(10)).toBe(visitedAt.slice(10));
  });

  test('rejects impossible visit dates through the ISO date validator', () => {
    expect(() => replaceVisitDate('2026-08-20T12:00:00+09:00', '2026-02-30'))
      .toThrow('Visit timestamps must contain a valid calendar date.');
  });

  test('keeps visit ordering based on the stored ISO instant', () => {
    const summary = getRestaurantSummary('restaurant-1', {
      restaurants: [{ id: 'restaurant-1', name: 'Test', createdAt: '2026-01-01' }],
      menus: [{ id: 'menu-1', restaurantId: 'restaurant-1', name: 'Menu', createdAt: '2026-01-01' }],
      visits: [
        { id: 'later-date', restaurantId: 'restaurant-1', visitedAt: '2025-06-02T00:00:00+09:00', service: 5, atmosphere: 5, photoUris: [] },
        { id: 'later-instant', restaurantId: 'restaurant-1', visitedAt: '2025-06-01T16:00:00Z', service: 5, atmosphere: 5, photoUris: [] },
      ],
      menuRatings: [
        { id: 'rating-1', visitId: 'later-date', menuId: 'menu-1', taste: 5, value: 5 },
        { id: 'rating-2', visitId: 'later-instant', menuId: 'menu-1', taste: 5, value: 5 },
      ],
    }, DEFAULT_SCORE_POLICY);

    expect(summary?.visits.map(({ visit }) => visit.id)).toEqual(['later-instant', 'later-date']);
  });
});
