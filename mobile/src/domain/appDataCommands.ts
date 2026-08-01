import type { AppData, Menu, MenuRating, Restaurant, Visit } from './appData';
import { parseIsoDate } from './scoring';

export type AppendVisitCommand = {
  visit: Visit;
  newMenus: Menu[];
  menuRatings: MenuRating[];
};

const validateId = (id: string, values: Array<{ id: string }>) => {
  if (!id.trim()) throw new Error('ID is required.');
  if (values.some((value) => value.id === id)) throw new Error('ID already exists.');
};

const validateRating = (rating: number) => {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('Ratings must be integers from 1 through 5.');
  }
};

export const appendRestaurant = (data: AppData, restaurant: Restaurant): AppData => {
  const name = restaurant.name.trim();
  if (!name) throw new Error('Restaurant name is required.');
  validateId(restaurant.id, data.restaurants);
  parseIsoDate(restaurant.createdAt);
  return { ...data, restaurants: [...data.restaurants, { ...restaurant, name }] };
};

export const appendMenu = (data: AppData, menu: Menu): AppData => {
  const name = menu.name.trim();
  if (!name) throw new Error('Menu name is required.');
  validateId(menu.id, data.menus);
  parseIsoDate(menu.createdAt);
  if (!data.restaurants.some(({ id }) => id === menu.restaurantId)) {
    throw new Error('Restaurant does not exist.');
  }
  return { ...data, menus: [...data.menus, { ...menu, name }] };
};

const validateVisitCommand = (data: AppData, command: AppendVisitCommand) => {
  const { visit, newMenus, menuRatings } = command;
  validateId(visit.id, data.visits);
  if (!data.restaurants.some(({ id }) => id === visit.restaurantId)) {
    throw new Error('Restaurant does not exist.');
  }
  parseIsoDate(visit.visitedAt);
  validateRating(visit.service);
  validateRating(visit.atmosphere);
  if (menuRatings.length === 0) throw new Error('At least one menu rating is required.');

  newMenus.forEach((menu, index) => {
    validateId(menu.id, [...data.menus, ...newMenus.slice(0, index)]);
    if (!menu.name.trim()) throw new Error('Menu name is required.');
    parseIsoDate(menu.createdAt);
    if (menu.restaurantId !== visit.restaurantId) {
      throw new Error('Menu does not belong to the visit restaurant.');
    }
  });

  const menus = new Map([...data.menus, ...newMenus].map((menu) => [menu.id, menu]));
  menuRatings.forEach((rating, index) => {
    validateId(rating.id, [...data.menuRatings, ...menuRatings.slice(0, index)]);
    if (rating.visitId !== visit.id) throw new Error('Menu rating does not belong to the visit.');
    validateRating(rating.taste);
    validateRating(rating.value);
    const menu = menus.get(rating.menuId);
    if (!menu) throw new Error('Menu does not exist.');
    if (menu.restaurantId !== visit.restaurantId) {
      throw new Error('Menu does not belong to the visit restaurant.');
    }
  });
};

export const appendVisit = (data: AppData, command: AppendVisitCommand): AppData => {
  validateVisitCommand(data, command);
  const newMenus = command.newMenus.map((menu) => ({ ...menu, name: menu.name.trim() }));
  return {
    ...data,
    menus: [...data.menus, ...newMenus],
    visits: [...data.visits, command.visit],
    menuRatings: [...data.menuRatings, ...command.menuRatings],
  };
};
