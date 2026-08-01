import AsyncStorage from '@react-native-async-storage/async-storage';

import { createEmptyAppData, type AppData } from '../domain/appData';
import { parseIsoDate } from '../domain/scoring';

const APP_DATA_KEY = 'mychelin-data-v1';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isOptionalString = (value: unknown) => value === undefined || typeof value === 'string';
const isScore = (value: unknown) => Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5;
const isIsoDate = (value: unknown) => {
  if (typeof value !== 'string') return false;
  try {
    parseIsoDate(value);
    return true;
  } catch {
    return false;
  }
};

const isRestaurant = (value: unknown) =>
  isRecord(value) && isText(value.id) && isText(value.name) && isIsoDate(value.createdAt)
  && isOptionalString(value.category) && isOptionalString(value.address);
const isMenu = (value: unknown) =>
  isRecord(value) && isText(value.id) && isText(value.restaurantId) && isText(value.name) && isIsoDate(value.createdAt);
const isVisit = (value: unknown) =>
  isRecord(value) && isText(value.id) && isText(value.restaurantId) && isIsoDate(value.visitedAt)
  && (value.daypart === undefined || ['breakfast', 'lunch', 'dinner', 'late-night'].includes(String(value.daypart)))
  && isScore(value.service) && isScore(value.atmosphere) && isOptionalString(value.note)
  && Array.isArray(value.photoUris) && value.photoUris.every((uri) => typeof uri === 'string');
const isMenuRating = (value: unknown) =>
  isRecord(value) && isText(value.id) && isText(value.visitId) && isText(value.menuId)
  && isScore(value.taste) && isScore(value.value);
const hasUniqueIds = (values: Array<{ id: string }>) =>
  new Set(values.map(({ id }) => id)).size === values.length;

const isAppData = (value: unknown): value is AppData => {
  if (!isRecord(value)
    || !Array.isArray(value.restaurants) || !value.restaurants.every(isRestaurant)
    || !Array.isArray(value.menus) || !value.menus.every(isMenu)
    || !Array.isArray(value.visits) || !value.visits.every(isVisit)
    || !Array.isArray(value.menuRatings) || !value.menuRatings.every(isMenuRating)) return false;

  const data = value as AppData;
  if (![data.restaurants, data.menus, data.visits, data.menuRatings].every(hasUniqueIds)) return false;

  const restaurantIds = new Set(data.restaurants.map(({ id }) => id));
  const menus = new Map(data.menus.map((menu) => [menu.id, menu]));
  const visits = new Map(data.visits.map((visit) => [visit.id, visit]));
  return data.menus.every(({ restaurantId }) => restaurantIds.has(restaurantId))
    && data.visits.every(({ restaurantId }) => restaurantIds.has(restaurantId))
    && data.visits.every(({ id }) => data.menuRatings.some(({ visitId }) => visitId === id))
    && data.menuRatings.every(({ menuId, visitId }) => {
      const menu = menus.get(menuId);
      const visit = visits.get(visitId);
      return menu !== undefined && visit !== undefined && menu.restaurantId === visit.restaurantId;
    });
};

export const loadAppData = async (): Promise<AppData> => {
  const saved = await AsyncStorage.getItem(APP_DATA_KEY);
  if (!saved) return createEmptyAppData();

  try {
    const parsed: unknown = JSON.parse(saved);
    return isAppData(parsed) ? parsed : createEmptyAppData();
  } catch {
    return createEmptyAppData();
  }
};

export const saveAppData = (data: AppData) => AsyncStorage.setItem(APP_DATA_KEY, JSON.stringify(data));
