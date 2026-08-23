import type { AppData } from '../appData';
import {
  deleteRestaurant,
  deleteVisit,
  updateRestaurant,
  updateVisit,
} from '../appDataCommands';

const data: AppData = {
  restaurants: [
    { id: 'restaurant-1', name: 'Old name', category: 'Old', createdAt: '2026-08-01' },
    { id: 'restaurant-2', name: 'Empty', createdAt: '2026-08-01' },
  ],
  menus: [
    { id: 'menu-1', restaurantId: 'restaurant-1', name: 'Noodles', createdAt: '2026-08-01' },
    { id: 'menu-unused', restaurantId: 'restaurant-2', name: 'Tea', createdAt: '2026-08-01' },
  ],
  visits: [{
    id: 'visit-1',
    restaurantId: 'restaurant-1',
    visitedAt: '2026-08-20T12:00:00+09:00',
    daypart: 'lunch',
    service: 3,
    atmosphere: 4,
    note: 'Old note',
    photoUris: ['file:///meal.jpg'],
  }],
  menuRatings: [{
    id: 'rating-1',
    visitId: 'visit-1',
    menuId: 'menu-1',
    taste: 3,
    value: 4,
  }],
};

describe('record editing commands', () => {
  test('updates editable restaurant fields without mutating the source', () => {
    const next = updateRestaurant(data, {
      ...data.restaurants[0],
      name: '  New name  ',
      category: 'Korean',
      address: 'Seoul',
    });

    expect(next.restaurants[0]).toEqual({
      ...data.restaurants[0],
      name: 'New name',
      category: 'Korean',
      address: 'Seoul',
    });
    expect(data.restaurants[0].name).toBe('Old name');
    expect(() => updateRestaurant(data, { ...data.restaurants[0], name: '  ' }))
      .toThrow('Restaurant name is required.');
    expect(() => updateRestaurant(data, { ...data.restaurants[0], id: 'missing' }))
      .toThrow('Restaurant does not exist.');
  });

  test('updates a visit and all of its existing menu ratings without mutating inputs', () => {
    const visit = {
      ...data.visits[0],
      visitedAt: '2026-08-21T18:30:00+09:00',
      daypart: 'dinner' as const,
      service: 5,
      atmosphere: 5,
      note: 'Updated',
      photoUris: [...data.visits[0].photoUris],
    };
    const menuRatings = [{ ...data.menuRatings[0], taste: 5, value: 5 }];

    const next = updateVisit(data, { visit, menuRatings });

    expect(next.visits[0]).toEqual(visit);
    expect(next.menuRatings[0]).toEqual(menuRatings[0]);
    visit.service = 1;
    visit.photoUris[0] = 'mutated';
    menuRatings[0].taste = 1;
    expect(next.visits[0]).toMatchObject({ service: 5, photoUris: ['file:///meal.jpg'] });
    expect(next.menuRatings[0].taste).toBe(5);
    expect(data.visits[0].service).toBe(3);
  });

  test('rejects invalid visit edits and foreign or incomplete ratings', () => {
    expect(() => updateVisit(data, {
      visit: { ...data.visits[0], visitedAt: '2026-02-30' },
      menuRatings: data.menuRatings,
    })).toThrow('Visit timestamps must contain a valid calendar date.');
    expect(() => updateVisit(data, {
      visit: { ...data.visits[0], service: 0 },
      menuRatings: data.menuRatings,
    })).toThrow('Ratings must be integers from 1 through 5.');
    expect(() => updateVisit(data, {
      visit: data.visits[0],
      menuRatings: [],
    })).toThrow('All existing menu ratings are required.');
    expect(() => updateVisit(data, {
      visit: data.visits[0],
      menuRatings: [{ ...data.menuRatings[0], visitId: 'other' }],
    })).toThrow('Menu rating does not belong to the visit.');
  });

  test('deleting a visit removes its ratings but keeps shared menus', () => {
    const next = deleteVisit(data, 'visit-1');

    expect(next.visits).toEqual([]);
    expect(next.menuRatings).toEqual([]);
    expect(next.menus).toEqual(data.menus);
    expect(data.visits).toHaveLength(1);
    expect(() => deleteVisit(data, 'missing')).toThrow('Visit does not exist.');
  });

  test('deletes only a restaurant with no visits and removes its unused menus', () => {
    const next = deleteRestaurant(data, 'restaurant-2');

    expect(next.restaurants.map(({ id }) => id)).toEqual(['restaurant-1']);
    expect(next.menus.map(({ id }) => id)).toEqual(['menu-1']);
    expect(() => deleteRestaurant(data, 'restaurant-1'))
      .toThrow('Delete the restaurant visits first.');
    expect(() => deleteRestaurant(data, 'missing')).toThrow('Restaurant does not exist.');
  });
});
