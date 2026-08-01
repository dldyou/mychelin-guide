/** @jest-environment jsdom */

import { act, type ReactNode } from 'react';

type Root = { render(children: ReactNode): void; unmount(): void };
const { createRoot } = require('react-dom/client') as {
  createRoot(container: Element | DocumentFragment): Root;
};

import {
  createEmptyAppData,
  type AppData,
  type Menu,
  type Restaurant,
  type Visit,
} from '../../domain/appData';
import { loadAppData, saveAppData } from '../../storage/appStorage';
import {
  AppDataProvider,
  type AppDataContextValue,
  useAppData,
} from '../AppDataProvider';

jest.mock('../../storage/appStorage', () => ({
  loadAppData: jest.fn(),
  saveAppData: jest.fn(),
}));

const mockedLoadAppData = jest.mocked(loadAppData);
const mockedSaveAppData = jest.mocked(saveAppData);

describe('AppDataProvider', () => {
  let container: HTMLDivElement;
  let root: Root;
  let current: AppDataContextValue;

  const Consumer = () => {
    current = useAppData();
    return null;
  };

  const renderProvider = async () => {
    await act(async () => {
      root.render(<AppDataProvider><Consumer /></AppDataProvider>);
    });
  };

  beforeEach(() => {
    mockedLoadAppData.mockResolvedValue(createEmptyAppData());
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.resetAllMocks();
  });

  test('loads the persisted document on mount', async () => {
    let resolveLoad!: (data: AppData) => void;
    mockedLoadAppData.mockReturnValue(new Promise((resolve) => {
      resolveLoad = resolve;
    }));
    const loaded: AppData = {
      restaurants: [{ id: 'restaurant-1', name: 'Soba', createdAt: '2026-08-01T00:00:00.000Z' }],
      menus: [],
      visits: [],
      menuRatings: [],
    };

    await renderProvider();
    expect(current.isLoading).toBe(true);

    await act(async () => resolveLoad(loaded));

    expect(current.isLoading).toBe(false);
    expect(current.data).toEqual(loaded);
  });

  test('finishes loading and exposes a load failure', async () => {
    const loadError = new Error('read failed');
    mockedLoadAppData.mockRejectedValue(loadError);

    await renderProvider();

    expect(current.isLoading).toBe(false);
    expect(current.data).toEqual(createEmptyAppData());
    expect(current.error).toBe(loadError);
  });

  test('publishes a restaurant only after persistence succeeds', async () => {
    let resolveSave!: () => void;
    mockedSaveAppData.mockReturnValue(new Promise((resolve) => {
      resolveSave = resolve;
    }));
    await renderProvider();

    let mutation!: Promise<Restaurant>;
    act(() => {
      mutation = current.addRestaurant({ name: 'Soba', category: 'Japanese', address: 'Seoul' });
    });

    expect(current.data.restaurants).toEqual([]);

    await act(async () => resolveSave());

    const restaurant = await mutation;
    expect(current.data.restaurants).toEqual([restaurant]);
    expect(restaurant).toMatchObject({ name: 'Soba', category: 'Japanese', address: 'Seoul' });
  });

  test('keeps restaurant state unchanged and exposes the error when persistence fails', async () => {
    const saveError = new Error('disk full');
    mockedSaveAppData.mockRejectedValue(saveError);
    await renderProvider();

    let mutation!: Promise<Restaurant>;
    act(() => {
      mutation = current.addRestaurant({ name: 'Soba' });
    });

    await act(async () => {
      await expect(mutation).rejects.toBe(saveError);
    });

    expect(current.data.restaurants).toEqual([]);
    expect(current.error).toBe(saveError);
  });

  test('adds a menu to its restaurant', async () => {
    mockedLoadAppData.mockResolvedValue({
      ...createEmptyAppData(),
      restaurants: [{ id: 'restaurant-1', name: 'Soba', createdAt: '2026-08-01T00:00:00.000Z' }],
    });
    mockedSaveAppData.mockResolvedValue();
    await renderProvider();

    let menu!: Menu;
    await act(async () => {
      menu = await current.addMenu({ restaurantId: 'restaurant-1', name: 'Cold soba' });
    });

    expect(current.data.menus).toEqual([menu]);
    expect(menu).toMatchObject({ restaurantId: 'restaurant-1', name: 'Cold soba' });
  });

  test('adds a visit with ratings for existing and newly named menus', async () => {
    mockedLoadAppData.mockResolvedValue({
      ...createEmptyAppData(),
      restaurants: [{ id: 'restaurant-1', name: 'Soba', createdAt: '2026-08-01T00:00:00.000Z' }],
      menus: [{
        id: 'menu-existing',
        restaurantId: 'restaurant-1',
        name: 'Cold soba',
        createdAt: '2026-08-01T00:00:00.000Z',
      }],
    });
    mockedSaveAppData.mockResolvedValue();
    await renderProvider();

    let visit!: Visit;
    await act(async () => {
      visit = await current.addVisit({
        restaurantId: 'restaurant-1',
        service: 5,
        atmosphere: 4,
        menuRatings: [
          { menuId: 'menu-existing', taste: 5, value: 4 },
          { menuName: 'Tempura', taste: 4, value: 3 },
        ],
      });
    });

    const newMenu = current.data.menus.find(({ id }) => id !== 'menu-existing');
    expect(current.data.visits).toEqual([visit]);
    expect(visit.photoUris).toEqual([]);
    expect(newMenu).toMatchObject({ restaurantId: 'restaurant-1', name: 'Tempura' });
    expect(newMenu?.createdAt).toBe(visit.visitedAt);
    expect(current.data.menuRatings).toEqual([
      expect.objectContaining({ visitId: visit.id, menuId: 'menu-existing', taste: 5, value: 4 }),
      expect.objectContaining({ visitId: visit.id, menuId: newMenu?.id, taste: 4, value: 3 }),
    ]);
  });
});
