import AsyncStorage from '@react-native-async-storage/async-storage';

import { createEmptyAppData } from '../../domain/appData';
import { loadAppData, saveAppData } from '../appStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('appStorage', () => {
  const createValidData = () => ({
    restaurants: [{ id: 'restaurant-1', name: 'Noodle House', createdAt: '2026-07-31' }],
    menus: [{ id: 'menu-1', restaurantId: 'restaurant-1', name: 'Noodles', createdAt: '2026-07-31' }],
    visits: [{
      id: 'visit-1',
      restaurantId: 'restaurant-1',
      visitedAt: '2026-07-31',
      service: 4,
      atmosphere: 5,
      photoUris: [],
    }],
    menuRatings: [{ id: 'rating-1', visitId: 'visit-1', menuId: 'menu-1', taste: 4, value: 5 }],
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty data when storage has no saved document', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    await expect(loadAppData()).resolves.toEqual({
      restaurants: [],
      menus: [],
      visits: [],
      menuRatings: [],
    });
  });

  it('restores a saved restaurant and visit with the same fields', async () => {
    const data = createValidData();

    await saveAppData(data);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('mychelin-data-v1', JSON.stringify(data));
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      (AsyncStorage.setItem as jest.Mock).mock.calls[0][1],
    );

    await expect(loadAppData()).resolves.toEqual(data);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('mychelin-data-v1');
  });

  it('returns empty data when the saved document is not valid JSON', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('{not-json');

    await expect(loadAppData()).resolves.toEqual(createEmptyAppData());
  });

  it.each([
    null,
    {},
    { restaurants: {}, menus: [], visits: [], menuRatings: [] },
    {
      restaurants: [],
      menus: [],
      visits: [],
      menuRatings: [{ id: 'rating-1', visitId: 'visit-1', menuId: 'menu-1', taste: 0, value: 5 }],
    },
  ])('returns empty data when the saved document has an invalid shape', async (saved) => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(saved));

    await expect(loadAppData()).resolves.toEqual(createEmptyAppData());
  });

  it.each([
    { name: 'invalid dates', mutate: (data: ReturnType<typeof createValidData>) => { data.visits[0].visitedAt = 'not-a-date'; } },
    { name: 'duplicate IDs', mutate: (data: ReturnType<typeof createValidData>) => { data.restaurants.push({ ...data.restaurants[0] }); } },
    {
      name: 'ratings for a menu from another restaurant',
      mutate: (data: ReturnType<typeof createValidData>) => {
        data.restaurants.push({ id: 'restaurant-2', name: 'Cafe', createdAt: '2026-07-31' });
        data.menus.push({ id: 'menu-2', restaurantId: 'restaurant-2', name: 'Coffee', createdAt: '2026-07-31' });
        data.menuRatings[0].menuId = 'menu-2';
      },
    },
    { name: 'visits without menu ratings', mutate: (data: ReturnType<typeof createValidData>) => { data.menuRatings = []; } },
  ])('returns empty data for $name', async ({ mutate }) => {
    const data = createValidData();
    mutate(data);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(data));

    await expect(loadAppData()).resolves.toEqual(createEmptyAppData());
  });

  it('rejects when storage cannot persist the document', async () => {
    const error = new Error('disk full');
    (AsyncStorage.setItem as jest.Mock).mockRejectedValue(error);

    await expect(saveAppData(createEmptyAppData())).rejects.toBe(error);
  });
});
