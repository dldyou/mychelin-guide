export type Restaurant = { id: string; name: string; category?: string; address?: string; createdAt: string };
export type Menu = { id: string; restaurantId: string; name: string; createdAt: string };
export type Visit = {
  id: string;
  restaurantId: string;
  visitedAt: string;
  daypart?: 'breakfast' | 'lunch' | 'dinner' | 'late-night';
  service: number;
  atmosphere: number;
  note?: string;
  photoUris: string[];
};
export type MenuRating = { id: string; visitId: string; menuId: string; taste: number; value: number };
export type AppData = { restaurants: Restaurant[]; menus: Menu[]; visits: Visit[]; menuRatings: MenuRating[] };

export const createEmptyAppData = (): AppData => ({ restaurants: [], menus: [], visits: [], menuRatings: [] });
