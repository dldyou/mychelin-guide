import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
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
import {
  appendMenu,
  appendRestaurant,
  appendVisit,
  deleteRestaurant as deleteRestaurantCommand,
  deleteVisit as deleteVisitCommand,
  updateRestaurant as updateRestaurantCommand,
  updateVisit as updateVisitCommand,
} from '../domain/appDataCommands';
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

export type EditVisitInput = Pick<Visit, 'id' | 'visitedAt' | 'daypart' | 'service' | 'atmosphere' | 'note'> & {
  menuRatings: Array<Pick<MenuRating, 'id' | 'taste' | 'value'>>;
};

export type AppDataContextValue = {
  data: AppData;
  isLoading: boolean;
  error: Error | null;
  addRestaurant(input: Pick<Restaurant, 'name' | 'category' | 'address'>): Promise<Restaurant>;
  addMenu(input: Pick<Menu, 'restaurantId' | 'name'>): Promise<Menu>;
  addVisit(input: NewVisitInput): Promise<Visit>;
  updateRestaurant(
    id: string,
    input: Pick<Restaurant, 'name' | 'category' | 'address'>,
  ): Promise<Restaurant>;
  updateVisit(input: EditVisitInput): Promise<Visit>;
  deleteVisit(id: string): Promise<void>;
  deleteRestaurant(id: string): Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [data, setData] = useState(createEmptyAppData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const dataRef = useRef(data);
  const mutationQueue = useRef<Promise<void>>(Promise.resolve());
  const hydrationErrorRef = useRef<Error | null>(null);
  const hydrationRef = useRef<{ promise: Promise<void>; resolve(): void } | null>(null);
  if (!hydrationRef.current) {
    let resolve!: () => void;
    hydrationRef.current = {
      promise: new Promise((complete) => {
        resolve = complete;
      }),
      resolve: () => resolve(),
    };
  }
  const hydration = hydrationRef.current;

  useEffect(() => {
    loadAppData().then((loadedData) => {
      dataRef.current = loadedData;
      setData(loadedData);
    }).catch((cause) => {
      const error = cause instanceof Error ? cause : new Error('Failed to load app data.');
      hydrationErrorRef.current = error;
      setError(error);
    }).finally(() => {
      setIsLoading(false);
      hydration.resolve();
    });
  }, [hydration]);

  const persist = async (nextData: AppData) => {
    try {
      await saveAppData(nextData);
      dataRef.current = nextData;
      setData(nextData);
      setError(null);
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error('Failed to save app data.');
      setError(error);
      throw error;
    }
  };

  const enqueueMutation = <T,>(
    build: (currentData: AppData) => { nextData: AppData; result: T },
  ): Promise<T> => {
    const mutation = mutationQueue.current.then(async () => {
      await hydration.promise;
      if (hydrationErrorRef.current) throw hydrationErrorRef.current;
      const { nextData, result } = build(dataRef.current);
      await persist(nextData);
      return result;
    });
    mutationQueue.current = mutation.then(() => undefined, () => undefined);
    return mutation;
  };

  const addRestaurant = (
    input: Pick<Restaurant, 'name' | 'category' | 'address'>,
  ): Promise<Restaurant> => {
    const snapshot = { ...input };
    return enqueueMutation((currentData) => {
      const result: Restaurant = {
        ...snapshot,
        id: createId('restaurant'),
        createdAt: new Date().toISOString(),
      };
      return { nextData: appendRestaurant(currentData, result), result };
    });
  };

  const addMenu = (input: Pick<Menu, 'restaurantId' | 'name'>): Promise<Menu> => {
    const snapshot = { ...input };
    return enqueueMutation((currentData) => {
      const result: Menu = {
        ...snapshot,
        id: createId('menu'),
        createdAt: new Date().toISOString(),
      };
      return { nextData: appendMenu(currentData, result), result };
    });
  };

  const addVisit = (input: NewVisitInput): Promise<Visit> => {
    const snapshot: NewVisitInput = {
      ...input,
      photoUris: input.photoUris ? [...input.photoUris] : undefined,
      menuRatings: input.menuRatings.map((rating) => ({ ...rating })),
    };
    return enqueueMutation((currentData) => {
      const createdAt = new Date().toISOString();
      const result: Visit = {
        id: createId('visit'),
        restaurantId: snapshot.restaurantId,
        visitedAt: snapshot.visitedAt ?? createdAt,
        daypart: snapshot.daypart,
        service: snapshot.service,
        atmosphere: snapshot.atmosphere,
        note: snapshot.note,
        photoUris: snapshot.photoUris ?? [],
      };
      const newMenus: Menu[] = [];
      const menuRatings: MenuRating[] = snapshot.menuRatings.map((inputRating) => {
        let menuId = inputRating.menuId;
        if (!menuId && inputRating.menuName !== undefined) {
          const menu: Menu = {
            id: createId('menu'),
            restaurantId: snapshot.restaurantId,
            name: inputRating.menuName,
            createdAt,
          };
          newMenus.push(menu);
          menuId = menu.id;
        }
        return {
          id: createId('rating'),
          visitId: result.id,
          menuId: menuId ?? '',
          taste: inputRating.taste,
          value: inputRating.value,
        };
      });
      const nextData = appendVisit(currentData, { visit: result, newMenus, menuRatings });
      return { nextData, result };
    });
  };

  const updateRestaurant = (
    id: string,
    input: Pick<Restaurant, 'name' | 'category' | 'address'>,
  ): Promise<Restaurant> => {
    const snapshot = { id, ...input };
    return enqueueMutation((currentData) => {
      const nextData = updateRestaurantCommand(currentData, snapshot);
      const result = { ...nextData.restaurants.find((restaurant) => restaurant.id === id)! };
      return { nextData, result };
    });
  };

  const updateVisit = (input: EditVisitInput): Promise<Visit> => {
    const snapshot: EditVisitInput = {
      ...input,
      menuRatings: input.menuRatings.map((rating) => ({ ...rating })),
    };
    return enqueueMutation((currentData) => {
      const currentVisit = currentData.visits.find(({ id }) => id === snapshot.id);
      if (!currentVisit) throw new Error('Visit does not exist.');
      const menuRatings = snapshot.menuRatings.map((rating) => {
        const currentRating = currentData.menuRatings.find(({ id }) => id === rating.id);
        if (!currentRating) throw new Error('Menu rating does not belong to the visit.');
        return { ...currentRating, ...rating };
      });
      const result: Visit = {
        ...currentVisit,
        visitedAt: snapshot.visitedAt,
        daypart: snapshot.daypart,
        service: snapshot.service,
        atmosphere: snapshot.atmosphere,
        note: snapshot.note,
        photoUris: [...currentVisit.photoUris],
      };
      return { nextData: updateVisitCommand(currentData, { visit: result, menuRatings }), result };
    });
  };

  const deleteVisit = (id: string): Promise<void> => enqueueMutation((currentData) => ({
    nextData: deleteVisitCommand(currentData, id),
    result: undefined,
  }));

  const deleteRestaurant = (id: string): Promise<void> => enqueueMutation((currentData) => ({
    nextData: deleteRestaurantCommand(currentData, id),
    result: undefined,
  }));

  return (
    <AppDataContext.Provider value={{
      data,
      isLoading,
      error,
      addRestaurant,
      addMenu,
      addVisit,
      updateRestaurant,
      updateVisit,
      deleteVisit,
      deleteRestaurant,
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
