import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { Restaurant } from '@/src/domain/appData';
import { colors } from '@/src/theme/colors';

export type RestaurantCardProps = {
  restaurant: Restaurant;
  onPress(): void;
};

export function RestaurantCard({ restaurant, onPress }: RestaurantCardProps) {
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onPress={onPress}
      style={({ pressed }) => [styles.card, (pressed || focused) && styles.cardActive]}
    >
      <Text style={styles.name}>{restaurant.name}</Text>
      {restaurant.category ? <Text style={styles.detail}>{restaurant.category}</Text> : null}
      {restaurant.address ? <Text style={styles.detail}>{restaurant.address}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 44,
    gap: 4,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  cardActive: {
    borderColor: colors.accent,
  },
  name: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '700',
  },
  detail: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 20,
  },
});
