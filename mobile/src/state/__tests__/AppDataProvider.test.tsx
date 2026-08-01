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
  type NewVisitInput,
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

  test('rejects mutations without saving after hydration fails', async () => {
    const loadError = new Error('read failed');
    mockedLoadAppData.mockRejectedValue(loadError);
    await renderProvider();

    let mutations!: Promise<unknown>[];
    act(() => {
      mutations = [
        current.addRestaurant({ name: 'Soba' }),
        current.addMenu({ restaurantId: 'missing', name: 'Cold soba' }),
        current.addVisit({
          restaurantId: 'missing',
          service: 5,
          atmosphere: 4,
          menuRatings: [{ menuName: 'Cold soba', taste: 5, value: 4 }],
        }),
      ];
    });

    await act(async () => {
      await Promise.all(mutations.map((mutation) => expect(mutation).rejects.toBe(loadError)));
    });

    expect(mockedSaveAppData).not.toHaveBeenCalled();
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

  test('waits for hydration before applying a mutation to loaded data', async () => {
    let resolveLoad!: (data: AppData) => void;
    mockedLoadAppData.mockReturnValue(new Promise((resolve) => {
      resolveLoad = resolve;
    }));
    let savedData!: AppData;
    mockedSaveAppData.mockImplementation(async (nextData) => {
      savedData = nextData;
    });
    const loaded: AppData = {
      ...createEmptyAppData(),
      restaurants: [{
        id: 'restaurant-loaded',
        name: 'Loaded restaurant',
        createdAt: '2026-08-01T00:00:00.000Z',
      }],
    };
    await renderProvider();

    let mutation!: Promise<Restaurant>;
    act(() => {
      mutation = current.addRestaurant({ name: 'New restaurant' });
    });
    await act(async () => Promise.resolve());

    let restaurant!: Restaurant;
    await act(async () => {
      resolveLoad(loaded);
      restaurant = await mutation;
    });

    expect(current.data.restaurants).toEqual([loaded.restaurants[0], restaurant]);
    expect(savedData.restaurants).toEqual([loaded.restaurants[0], restaurant]);
  });

  test('serializes concurrent mutations against the latest persisted data', async () => {
    const saves: Array<{ data: AppData; resolve(): void }> = [];
    mockedSaveAppData.mockImplementation((nextData) => new Promise((resolve) => {
      saves.push({ data: nextData, resolve });
    }));
    await renderProvider();

    let firstMutation!: Promise<Restaurant>;
    let secondMutation!: Promise<Restaurant>;
    act(() => {
      firstMutation = current.addRestaurant({ name: 'First' });
      secondMutation = current.addRestaurant({ name: 'Second' });
    });
    await act(async () => Promise.resolve());

    let first!: Restaurant;
    await act(async () => {
      saves[0].resolve();
      first = await firstMutation;
    });
    expect(current.data.restaurants).toEqual([first]);
    const secondSavedData = saves[1].data;

    let second!: Restaurant;
    await act(async () => {
      saves[1].resolve();
      second = await secondMutation;
    });

    expect(secondSavedData.restaurants).toEqual([first, second]);
    expect(current.data.restaurants).toEqual([first, second]);
  });

  test('snapshots mutation inputs before queued work runs', async () => {
    let resolveLoad!: (data: AppData) => void;
    mockedLoadAppData.mockReturnValue(new Promise((resolve) => {
      resolveLoad = resolve;
    }));
    let savedData!: AppData;
    mockedSaveAppData.mockImplementation(async (nextData) => {
      savedData = nextData;
    });
    const loaded: AppData = {
      ...createEmptyAppData(),
      restaurants: [{
        id: 'restaurant-loaded',
        name: 'Loaded restaurant',
        createdAt: '2026-08-01T00:00:00.000Z',
      }],
      menus: [{
        id: 'menu-loaded',
        restaurantId: 'restaurant-loaded',
        name: 'Loaded menu',
        createdAt: '2026-08-01T00:00:00.000Z',
      }],
    };
    const restaurantInput = { name: 'Call-time restaurant', category: 'Original category' };
    const menuInput = { restaurantId: 'restaurant-loaded', name: 'Call-time menu' };
    const photoUris = ['photo-original'];
    const menuRatings = [
      { menuId: 'menu-loaded', taste: 5, value: 4 },
      { menuName: 'Call-time new menu', taste: 4, value: 3 },
    ];
    const visitInput: NewVisitInput = {
      restaurantId: 'restaurant-loaded',
      visitedAt: '2026-08-01T12:00:00.000Z',
      daypart: 'lunch',
      service: 5,
      atmosphere: 4,
      note: 'Original note',
      photoUris,
      menuRatings,
    };
    await renderProvider();

    let restaurantMutation!: Promise<Restaurant>;
    let menuMutation!: Promise<Menu>;
    let visitMutation!: Promise<Visit>;
    act(() => {
      restaurantMutation = current.addRestaurant(restaurantInput);
      menuMutation = current.addMenu(menuInput);
      visitMutation = current.addVisit(visitInput);
    });
    restaurantInput.name = 'Mutated restaurant';
    restaurantInput.category = 'Mutated category';
    menuInput.name = 'Mutated menu';
    visitInput.service = 1;
    visitInput.note = 'Mutated note';
    photoUris[0] = 'photo-mutated';
    photoUris.push('photo-added');
    menuRatings[0].taste = 1;
    menuRatings[1].menuName = 'Mutated new menu';
    menuRatings.push({ menuId: 'menu-loaded', taste: 1, value: 1 });

    let restaurant!: Restaurant;
    let menu!: Menu;
    let visit!: Visit;
    await act(async () => {
      resolveLoad(loaded);
      [restaurant, menu, visit] = await Promise.all([
        restaurantMutation,
        menuMutation,
        visitMutation,
      ]);
    });

    expect(restaurant).toMatchObject({ name: 'Call-time restaurant', category: 'Original category' });
    expect(menu.name).toBe('Call-time menu');
    expect(visit).toMatchObject({ service: 5, note: 'Original note', photoUris: ['photo-original'] });
    expect(current.data.restaurants.find(({ id }) => id === restaurant.id)).toEqual(restaurant);
    expect(current.data.menus.find(({ id }) => id === menu.id)).toEqual(menu);
    expect(current.data.visits).toEqual([visit]);
    expect(current.data.menuRatings).toHaveLength(2);
    expect(current.data.menuRatings[0]).toMatchObject({ taste: 5, value: 4 });
    expect(current.data.menus.find(({ id }) => id !== 'menu-loaded' && id !== menu.id)?.name)
      .toBe('Call-time new menu');
    expect(savedData).toEqual(current.data);
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

  test('does not expose the stored visit through the returned object', async () => {
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
        photoUris: ['file:///meal.jpg'],
        menuRatings: [{ menuId: 'menu-existing', taste: 5, value: 4 }],
      });
    });

    visit.service = 1;
    visit.photoUris[0] = 'file:///mutated.jpg';

    expect(current.data.visits[0]).toMatchObject({
      service: 5,
      photoUris: ['file:///meal.jpg'],
    });
  });
});
