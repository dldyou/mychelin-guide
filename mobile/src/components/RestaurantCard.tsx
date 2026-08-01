import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Restaurant } from '@/src/domain/appData';
import { colors } from '@/src/theme/colors';

export type RestaurantCardProps = {
  restaurant: Restaurant;
  score?: number | null;
  visitCount?: number;
  onPress(): void;
};

export function RestaurantCard({ restaurant, score = null, visitCount, onPress }: RestaurantCardProps) {
  const [focused, setFocused] = useState(false);
  const scoreLabel = score === null ? '평가 전' : `개인 점수 ${score.toFixed(1)}`;
  const accessibilityLabel = visitCount === undefined
    ? restaurant.name
    : `${restaurant.name}, ${scoreLabel}, 방문 ${visitCount}회`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onPress={onPress}
      style={({ pressed }) => [styles.card, (pressed || focused) && styles.cardActive]}
    >
      <Text style={styles.name}>{restaurant.name}</Text>
      {restaurant.category ? <Text style={styles.detail}>{restaurant.category}</Text> : null}
      {restaurant.address ? <Text style={styles.detail}>{restaurant.address}</Text> : null}
      {visitCount === undefined ? null : (
        <View style={styles.summary}>
          <Text style={styles.detail}>{scoreLabel}</Text>
          <Text style={styles.detail}>{`방문 ${visitCount}회`}</Text>
        </View>
      )}
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
  summary: {
    flexDirection: 'row',
    gap: 12,
  },
});
