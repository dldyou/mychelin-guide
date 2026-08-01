import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme/colors';

export type RatingRowProps = {
  label: string;
  value: number | null;
  onChange(value: number): void;
};

const RATINGS = [1, 2, 3, 4, 5] as const;

export function RatingRow({ label, value, onChange }: RatingRowProps) {
  const [focusedRating, setFocusedRating] = useState<number | null>(null);

  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.options}>
        {RATINGS.map((rating) => {
          const checked = value === rating;
          return (
            <Pressable
              key={rating}
              accessibilityRole="radio"
              accessibilityState={{ checked }}
              accessibilityLabel={`${rating} out of 5`}
              onBlur={() => setFocusedRating(null)}
              onFocus={() => setFocusedRating(rating)}
              onPress={() => onChange(rating)}
              style={({ pressed }) => [
                styles.option,
                checked && styles.optionSelected,
                (pressed || focusedRating === rating) && styles.optionActive,
              ]}
            >
              <Text style={[styles.optionText, checked && styles.optionTextSelected]}>{rating}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
  },
  label: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  options: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  optionActive: {
    borderColor: colors.ink,
  },
  optionText: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
});
