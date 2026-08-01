import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { RestaurantCard } from '@/src/components/RestaurantCard';
import { Screen } from '@/src/components/Screen';
import { searchRestaurants } from '@/src/domain/restaurantSearch';
import { useAppData } from '@/src/state/AppDataProvider';
import { colors } from '@/src/theme/colors';

export default function RestaurantSearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { data, isLoading, error } = useAppData();
  const restaurants = searchRestaurants(data, query);
  const isSearching = query.trim().length > 0;

  return (
    <Screen>
      <View style={styles.content}>
        <TextInput
          accessibilityLabel="식당 이름 검색"
          autoCapitalize="none"
          onChangeText={setQuery}
          placeholder="식당 이름 검색"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={query}
        />

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/restaurant/register')}
          style={({ pressed }) => [styles.registerButton, pressed && styles.buttonPressed]}
        >
          <Text style={styles.registerButtonText}>새 식당 등록하기</Text>
        </Pressable>

        <View style={styles.results}>
          <Text style={styles.heading}>{isSearching ? '검색 결과' : '최근 식당'}</Text>
          {isLoading ? <Text style={styles.message}>식당 정보를 불러오는 중이에요.</Text> : null}
          {error ? (
            <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.error}>
              {error.message}
            </Text>
          ) : null}
          {!isLoading && !error && restaurants.length === 0 ? (
            <Text style={styles.message}>
              {isSearching ? '검색 결과가 없습니다.' : '등록된 식당이 없습니다.'}
            </Text>
          ) : null}
          {restaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              onPress={() => router.push({
                pathname: '/visit/new',
                params: { restaurantId: restaurant.id },
              })}
            />
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 16,
  },
  registerButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.accent,
  },
  registerButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.75,
  },
  results: {
    gap: 12,
  },
  heading: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '700',
  },
  message: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  error: {
    color: colors.accent,
    fontSize: 16,
    lineHeight: 24,
  },
});
