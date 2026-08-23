import type { Restaurant } from '../domain/appData';

export function buildRestaurantMapUrl({ name, address }: Pick<Restaurant, 'name' | 'address'>): string {
  const query = [address?.trim(), name.trim()].filter(Boolean).join(' ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
