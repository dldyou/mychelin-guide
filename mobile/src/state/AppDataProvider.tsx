import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  createEmptyAppData,
  type AppData,
  type Menu,
  type MenuRating,
  type Restaurant,
  type Visit,
} from '../domain/appData';
import { appendMenu, appendRestaurant, appendVisit } from '../domain/appDataCommands';
import { loadAppData, saveAppData } from '../storage/appStorage';
import { createId } from '../utils/createId';

export type NewVisitInput = {
  restaurantId: string;
  visitedAt?: string;
  daypart?: Visit['daypart'];
  service: number;
  atmosphere: number;
  note?: string;
  photoUris?: string[];
  menuRatings: Array<{
    menuId?: string;
    menuName?: string;
    taste: number;
    value: number;
  }>;
};

export type AppDataContextValue = {
  data: AppData;
  isLoading: boolean;
  error: Error | null;
  addRestaurant(input: Pick<Restaurant, 'name' | 'category' | 'address'>): Promise<Restaurant>;
  addMenu(input: Pick<Menu, 'restaurantId' | 'name'>): Promise<Menu>;
  addVisit(input: NewVisitInput): Promise<Visit>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [data, setData] = useState(createEmptyAppData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadAppData().then(setData).catch(setError).finally(() => setIsLoading(false));
  }, []);

  const persist = async (nextData: AppData) => {
    try {
      await saveAppData(nextData);
      setData(nextData);
      setError(null);
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error('Failed to save app data.');
      setError(error);
      throw error;
    }
  };

  const addRestaurant = async (
    input: Pick<Restaurant, 'name' | 'category' | 'address'>,
  ): Promise<Restaurant> => {
    const restaurant: Restaurant = {
      ...input,
      id: createId('restaurant'),
      createdAt: new Date().toISOString(),
    };
    const nextData = appendRestaurant(data, restaurant);
    await persist(nextData);
    return restaurant;
  };

  const addMenu = async (input: Pick<Menu, 'restaurantId' | 'name'>): Promise<Menu> => {
    const menu: Menu = {
      ...input,
      id: createId('menu'),
      createdAt: new Date().toISOString(),
    };
    const nextData = appendMenu(data, menu);
    await persist(nextData);
    return menu;
  };

  const addVisit = async (input: NewVisitInput): Promise<Visit> => {
    const createdAt = new Date().toISOString();
    const visit: Visit = {
      id: createId('visit'),
      restaurantId: input.restaurantId,
      visitedAt: input.visitedAt ?? createdAt,
      daypart: input.daypart,
      service: input.service,
      atmosphere: input.atmosphere,
      note: input.note,
      photoUris: input.photoUris ?? [],
    };
    const newMenus: Menu[] = [];
    const menuRatings: MenuRating[] = input.menuRatings.map((inputRating) => {
      let menuId = inputRating.menuId;
      if (!menuId && inputRating.menuName !== undefined) {
        const menu: Menu = {
          id: createId('menu'),
          restaurantId: input.restaurantId,
          name: inputRating.menuName,
          createdAt,
        };
        newMenus.push(menu);
        menuId = menu.id;
      }
      return {
        id: createId('rating'),
        visitId: visit.id,
        menuId: menuId ?? '',
        taste: inputRating.taste,
        value: inputRating.value,
      };
    });
    const nextData = appendVisit(data, { visit, newMenus, menuRatings });
    await persist(nextData);
    return visit;
  };

  return (
    <AppDataContext.Provider value={{
      data,
      isLoading,
      error,
      addRestaurant,
      addMenu,
      addVisit,
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppDataContextValue {
  const value = useContext(AppDataContext);
  if (!value) throw new Error('useAppData must be used within AppDataProvider.');
  return value;
}
