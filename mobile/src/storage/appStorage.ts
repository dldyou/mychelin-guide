import AsyncStorage from '@react-native-async-storage/async-storage';

import { createEmptyAppData, type AppData } from '../domain/appData';
import { parseIsoDate } from '../domain/scoring';

const APP_DATA_KEY = 'mychelin-data-v1';
const APP_DATA_VERSION = 1;

export class AppDataRecoveryError extends Error {
  constructor() {
    super('저장된 기록을 불러올 수 없습니다. 원본 데이터는 유지되었습니다.');
    this.name = 'AppDataRecoveryError';
  }
}

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

export const migrateStoredAppData = (value: unknown): AppData => {
  if (isRecord(value) && 'version' in value) {
    if (value.version === APP_DATA_VERSION && isAppData(value.data)) return value.data;
    throw new AppDataRecoveryError();
  }
  if (isAppData(value)) return value;
  throw new AppDataRecoveryError();
};

export const loadAppData = async (): Promise<AppData> => {
  const saved = await AsyncStorage.getItem(APP_DATA_KEY);
  if (saved === null) return createEmptyAppData();

  let parsed: unknown;
  try {
    parsed = JSON.parse(saved);
  } catch {
    throw new AppDataRecoveryError();
  }
  return migrateStoredAppData(parsed);
};

export const saveAppData = (data: AppData) => AsyncStorage.setItem(
  APP_DATA_KEY,
  JSON.stringify({ version: APP_DATA_VERSION, data }),
);
