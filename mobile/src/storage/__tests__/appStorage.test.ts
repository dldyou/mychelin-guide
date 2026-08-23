import AsyncStorage from '@react-native-async-storage/async-storage';

import { createEmptyAppData } from '../../domain/appData';
import { AppDataRecoveryError, loadAppData, saveAppData } from '../appStorage';

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

  it('saves an explicitly versioned document and restores its data', async () => {
    const data = createValidData();

    await saveAppData(data);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'mychelin-data-v1',
      JSON.stringify({ version: 1, data }),
    );
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      (AsyncStorage.setItem as jest.Mock).mock.calls[0][1],
    );

    await expect(loadAppData()).resolves.toEqual(data);
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('mychelin-data-v1');
  });

  it('migrates the current unversioned document without changing its data', async () => {
    const data = createValidData();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(data));

    await expect(loadAppData()).resolves.toEqual(data);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it.each(['', '{not-json'])('rejects a stable recovery error without overwriting invalid JSON', async (saved) => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(saved);

    await expect(loadAppData()).rejects.toEqual(new AppDataRecoveryError());
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
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
  ])('rejects a recovery error when the saved document has an invalid shape', async (saved) => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(saved));

    await expect(loadAppData()).rejects.toEqual(new AppDataRecoveryError());
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
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
  ])('rejects a recovery error for $name without overwriting storage', async ({ mutate }) => {
    const data = createValidData();
    mutate(data);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(data));

    await expect(loadAppData()).rejects.toEqual(new AppDataRecoveryError());
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('rejects an unsupported schema version without overwriting storage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
      version: 2,
      data: createValidData(),
    }));

    await expect(loadAppData()).rejects.toEqual(new AppDataRecoveryError());
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('rejects a versioned document whose data is corrupt without overwriting storage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({
      version: 1,
      data: { ...createEmptyAppData(), restaurants: {} },
    }));

    await expect(loadAppData()).rejects.toEqual(new AppDataRecoveryError());
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('rejects when storage cannot persist the document', async () => {
    const error = new Error('disk full');
    (AsyncStorage.setItem as jest.Mock).mockRejectedValue(error);

    await expect(saveAppData(createEmptyAppData())).rejects.toBe(error);
  });
});
