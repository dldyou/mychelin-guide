import {
  createEmptyAppData,
  type AppData,
  type Menu,
  type MenuRating,
  type Visit,
} from '../appData';
import { appendMenu, appendRestaurant, appendVisit } from '../appDataCommands';

const createVisitData = (): AppData => ({
  restaurants: [
    { id: 'restaurant-1', name: 'Noodle House', createdAt: '2026-08-01' },
    { id: 'restaurant-2', name: 'Cafe', createdAt: '2026-08-01' },
  ],
  menus: [
    { id: 'menu-1', restaurantId: 'restaurant-1', name: 'Noodles', createdAt: '2026-08-01' },
    { id: 'menu-2', restaurantId: 'restaurant-2', name: 'Coffee', createdAt: '2026-08-01' },
  ],
  visits: [
    {
      id: 'visit-existing',
      restaurantId: 'restaurant-1',
      visitedAt: '2026-07-31',
      service: 4,
      atmosphere: 5,
      photoUris: [],
    },
  ],
  menuRatings: [
    { id: 'rating-existing', visitId: 'visit-existing', menuId: 'menu-1', taste: 4, value: 5 },
  ],
});

type CommandOverrides = Partial<Visit> & {
  newMenus?: Menu[];
  menuRatings?: MenuRating[];
};

const commandWith = (overrides: CommandOverrides = {}) => {
  const {
    newMenus = [
      {
        id: 'menu-new',
        restaurantId: 'restaurant-1',
        name: 'Dumplings',
        createdAt: '2026-08-01',
      },
    ],
    menuRatings = [
      { id: 'rating-new', visitId: 'visit-1', menuId: 'menu-new', taste: 5, value: 4 },
    ],
    ...visitOverrides
  } = overrides;

  return {
    visit: {
      id: 'visit-1',
      restaurantId: 'restaurant-1',
      visitedAt: '2026-08-01T12:30:00+09:00',
      service: 4,
      atmosphere: 5,
      photoUris: [],
      ...visitOverrides,
    },
    newMenus,
    menuRatings,
  };
};

describe('app data commands', () => {
  it('trims and appends a restaurant without mutating the input', () => {
    const data = createEmptyAppData();
    const next = appendRestaurant(data, {
      id: 'restaurant-1',
      name: '  Noodle House  ',
      createdAt: '2026-08-01',
    });

    expect(next.restaurants[0].name).toBe('Noodle House');
    expect(data).toEqual(createEmptyAppData());
  });

  it('trims and appends a menu without mutating the input', () => {
    const data = appendRestaurant(createEmptyAppData(), {
      id: 'restaurant-1',
      name: 'Noodle House',
      createdAt: '2026-08-01',
    });
    const next = appendMenu(data, {
      id: 'menu-1',
      restaurantId: 'restaurant-1',
      name: '  Spicy Noodles  ',
      createdAt: '2026-08-01',
    });

    expect(next.menus[0].name).toBe('Spicy Noodles');
    expect(data.menus).toEqual([]);
  });

  it('rejects a blank restaurant or menu name', () => {
    expect(() =>
      appendRestaurant(createEmptyAppData(), {
        id: 'restaurant-1',
        name: '  ',
        createdAt: '2026-08-01',
      }),
    ).toThrow('Restaurant name is required.');

    const data = appendRestaurant(createEmptyAppData(), {
      id: 'restaurant-1',
      name: 'Noodle House',
      createdAt: '2026-08-01',
    });
    expect(() =>
      appendMenu(data, {
        id: 'menu-1',
        restaurantId: 'restaurant-1',
        name: '  ',
        createdAt: '2026-08-01',
      }),
    ).toThrow('Menu name is required.');
  });

  it('rejects blank IDs, invalid dates, and a menu for a missing restaurant', () => {
    expect(() =>
      appendRestaurant(createEmptyAppData(), {
        id: '  ',
        name: 'Noodle House',
        createdAt: '2026-08-01',
      }),
    ).toThrow('ID is required.');
    expect(() =>
      appendRestaurant(createEmptyAppData(), {
        id: 'restaurant-1',
        name: 'Noodle House',
        createdAt: '2026-02-30',
      }),
    ).toThrow('Visit timestamps must contain a valid calendar date.');
    expect(() =>
      appendMenu(createEmptyAppData(), {
        id: 'menu-1',
        restaurantId: 'missing',
        name: 'Spicy Noodles',
        createdAt: '2026-08-01',
      }),
    ).toThrow('Restaurant does not exist.');
  });

  it('rejects a visit for a missing restaurant', () => {
    expect(() => appendVisit(createVisitData(), commandWith({ restaurantId: 'missing' }))).toThrow(
      'Restaurant does not exist.',
    );
  });

  it('rejects a visit without menu ratings', () => {
    expect(() => appendVisit(createVisitData(), commandWith({ menuRatings: [] }))).toThrow(
      'At least one menu rating is required.',
    );
  });

  it('rejects non-integer or out-of-range visit ratings', () => {
    expect(() => appendVisit(createVisitData(), commandWith({ service: 0 }))).toThrow(
      'Ratings must be integers from 1 through 5.',
    );
  });

  it('rejects a blank new-menu name', () => {
    expect(() =>
      appendVisit(
        createVisitData(),
        commandWith({
          newMenus: [
            {
              id: 'menu-new',
              restaurantId: 'restaurant-1',
              name: '  ',
              createdAt: '2026-08-01',
            },
          ],
        }),
      ),
    ).toThrow('Menu name is required.');
  });

  it('rejects a rating for a menu owned by another restaurant', () => {
    expect(() =>
      appendVisit(
        createVisitData(),
        commandWith({
          newMenus: [],
          menuRatings: [
            { id: 'rating-new', visitId: 'visit-1', menuId: 'menu-2', taste: 5, value: 4 },
          ],
        }),
      ),
    ).toThrow('Menu does not belong to the visit restaurant.');
  });

  it('rejects duplicate visit, menu, and menu-rating IDs', () => {
    const data = createVisitData();

    expect(() => appendVisit(data, commandWith({ id: 'visit-existing' }))).toThrow(
      'ID already exists.',
    );
    expect(() =>
      appendVisit(
        data,
        commandWith({
          newMenus: [
            {
              id: 'menu-1',
              restaurantId: 'restaurant-1',
              name: 'Dumplings',
              createdAt: '2026-08-01',
            },
          ],
          menuRatings: [
            { id: 'rating-new', visitId: 'visit-1', menuId: 'menu-1', taste: 5, value: 4 },
          ],
        }),
      ),
    ).toThrow('ID already exists.');
    expect(() =>
      appendVisit(
        data,
        commandWith({
          menuRatings: [
            {
              id: 'rating-existing',
              visitId: 'visit-1',
              menuId: 'menu-new',
              taste: 5,
              value: 4,
            },
          ],
        }),
      ),
    ).toThrow('ID already exists.');
  });

  it('rejects an invalid visit timestamp', () => {
    expect(() => appendVisit(createVisitData(), commandWith({ visitedAt: '2026-02-30' }))).toThrow(
      'Visit timestamps must contain a valid calendar date.',
    );
  });

  it('trims a new-menu name without mutating the command', () => {
    const command = commandWith({
      newMenus: [
        {
          id: 'menu-new',
          restaurantId: 'restaurant-1',
          name: '  Dumplings  ',
          createdAt: '2026-08-01',
        },
      ],
    });

    const next = appendVisit(createVisitData(), command);

    expect(next.menus[next.menus.length - 1].name).toBe('Dumplings');
    expect(command.newMenus[0].name).toBe('  Dumplings  ');
  });

  it('appends a visit, a new menu, and ratings without mutating its inputs', () => {
    const data = createVisitData();
    const command = commandWith({
      daypart: 'lunch',
      note: 'Window seat',
      photoUris: ['file:///meal.jpg'],
      menuRatings: [
        { id: 'rating-new', visitId: 'visit-1', menuId: 'menu-1', taste: 5, value: 4 },
        { id: 'rating-new-menu', visitId: 'visit-1', menuId: 'menu-new', taste: 4, value: 5 },
      ],
    });
    const originalData = createVisitData();
    const originalCommand = commandWith({
      daypart: 'lunch',
      note: 'Window seat',
      photoUris: ['file:///meal.jpg'],
      menuRatings: [
        { id: 'rating-new', visitId: 'visit-1', menuId: 'menu-1', taste: 5, value: 4 },
        { id: 'rating-new-menu', visitId: 'visit-1', menuId: 'menu-new', taste: 4, value: 5 },
      ],
    });

    const next = appendVisit(data, command);

    expect(next.menus).toHaveLength(data.menus.length + 1);
    expect(next.visits).toHaveLength(data.visits.length + 1);
    expect(next.menuRatings).toHaveLength(data.menuRatings.length + 2);
    expect(next.visits[next.visits.length - 1]).toEqual({
      ...command.visit,
      daypart: 'lunch',
      note: 'Window seat',
      photoUris: ['file:///meal.jpg'],
    });
    expect(data).toEqual(originalData);
    expect(command).toEqual(originalCommand);
  });
});
