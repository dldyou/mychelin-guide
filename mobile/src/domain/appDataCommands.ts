import type { AppData, Menu, MenuRating, Restaurant, Visit } from './appData';
import { parseIsoDate } from './scoring';

export type AppendVisitCommand = {
  visit: Visit;
  newMenus: Menu[];
  menuRatings: MenuRating[];
};

export type UpdateRestaurantCommand = Pick<Restaurant, 'id' | 'name' | 'category' | 'address'>;
export type UpdateVisitCommand = { visit: Visit; menuRatings: MenuRating[] };

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
  const visit = { ...command.visit, photoUris: [...command.visit.photoUris] };
  const menuRatings = command.menuRatings.map((rating) => ({ ...rating }));
  return {
    ...data,
    menus: [...data.menus, ...newMenus],
    visits: [...data.visits, visit],
    menuRatings: [...data.menuRatings, ...menuRatings],
  };
};

export const updateRestaurant = (
  data: AppData,
  command: UpdateRestaurantCommand,
): AppData => {
  const index = data.restaurants.findIndex(({ id }) => id === command.id);
  if (index === -1) throw new Error('Restaurant does not exist.');
  const name = command.name.trim();
  if (!name) throw new Error('Restaurant name is required.');
  const restaurant = { ...data.restaurants[index], ...command, name };
  return {
    ...data,
    restaurants: data.restaurants.map((current, currentIndex) =>
      currentIndex === index ? restaurant : current),
  };
};

export const updateVisit = (data: AppData, command: UpdateVisitCommand): AppData => {
  const currentVisit = data.visits.find(({ id }) => id === command.visit.id);
  if (!currentVisit) throw new Error('Visit does not exist.');
  if (command.visit.restaurantId !== currentVisit.restaurantId) {
    throw new Error('Visit restaurant cannot be changed.');
  }
  if (!data.restaurants.some(({ id }) => id === command.visit.restaurantId)) {
    throw new Error('Restaurant does not exist.');
  }
  parseIsoDate(command.visit.visitedAt);
  validateRating(command.visit.service);
  validateRating(command.visit.atmosphere);

  const currentRatings = data.menuRatings.filter(({ visitId }) => visitId === command.visit.id);
  const commandRatingIds = new Set(command.menuRatings.map(({ id }) => id));
  if (
    commandRatingIds.size !== command.menuRatings.length
    || currentRatings.length !== command.menuRatings.length
    || currentRatings.some(({ id }) => !commandRatingIds.has(id))
  ) {
    throw new Error('All existing menu ratings are required.');
  }

  const ratingById = new Map(command.menuRatings.map((rating) => [rating.id, rating]));
  command.menuRatings.forEach((rating) => {
    const currentRating = data.menuRatings.find(({ id }) => id === rating.id);
    if (!currentRating || currentRating.visitId !== command.visit.id || rating.visitId !== command.visit.id) {
      throw new Error('Menu rating does not belong to the visit.');
    }
    if (rating.menuId !== currentRating.menuId) throw new Error('Menu rating menu cannot be changed.');
    const menu = data.menus.find(({ id }) => id === rating.menuId);
    if (!menu) throw new Error('Menu does not exist.');
    if (menu.restaurantId !== command.visit.restaurantId) {
      throw new Error('Menu does not belong to the visit restaurant.');
    }
    validateRating(rating.taste);
    validateRating(rating.value);
  });

  return {
    ...data,
    visits: data.visits.map((visit) => visit.id === command.visit.id
      ? { ...command.visit, photoUris: [...command.visit.photoUris] }
      : visit),
    menuRatings: data.menuRatings.map((rating) => {
      const replacement = ratingById.get(rating.id);
      return replacement ? { ...replacement } : rating;
    }),
  };
};

export const deleteVisit = (data: AppData, visitId: string): AppData => {
  if (!visitId.trim() || !data.visits.some(({ id }) => id === visitId)) {
    throw new Error('Visit does not exist.');
  }
  return {
    ...data,
    visits: data.visits.filter(({ id }) => id !== visitId),
    menuRatings: data.menuRatings.filter(({ visitId: ratingVisitId }) => ratingVisitId !== visitId),
  };
};

export const deleteRestaurant = (data: AppData, restaurantId: string): AppData => {
  if (!restaurantId.trim() || !data.restaurants.some(({ id }) => id === restaurantId)) {
    throw new Error('Restaurant does not exist.');
  }
  if (data.visits.some(({ restaurantId: visitRestaurantId }) => visitRestaurantId === restaurantId)) {
    throw new Error('Delete the restaurant visits first.');
  }
  return {
    ...data,
    restaurants: data.restaurants.filter(({ id }) => id !== restaurantId),
    menus: data.menus.filter(({ restaurantId: menuRestaurantId }) => menuRestaurantId !== restaurantId),
  };
};
