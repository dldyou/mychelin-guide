import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RestaurantCard } from '@/src/components/RestaurantCard';
import { Screen } from '@/src/components/Screen';
import {
  type RestaurantSummarySort,
  getRestaurantSummaries,
  sortRestaurantSummaries,
} from '@/src/domain/restaurantSummary';
import { DEFAULT_SCORE_POLICY } from '@/src/domain/scorePolicy';
import { useAppData } from '@/src/state/AppDataProvider';
import { colors } from '@/src/theme/colors';

export default function GuideScreen() {
  const router = useRouter();
  const [sort, setSort] = useState<RestaurantSummarySort>('score');
  const [focusedSort, setFocusedSort] = useState<RestaurantSummarySort | null>(null);
  const { data, isLoading, error } = useAppData();
  const summaries = sortRestaurantSummaries(
    getRestaurantSummaries(data, DEFAULT_SCORE_POLICY),
    sort,
  );
  const wantToVisit = summaries.filter(({ visitCount }) => visitCount === 0);
  const visited = summaries.filter(({ visitCount }) => visitCount > 0);

  return (
    <Screen>
      <View style={styles.intro}>
        <Text style={styles.title}>마이 가이드</Text>
        <Text style={styles.description}>
          내가 등록한 식당을 점수와 방문 횟수로 정리해요.
        </Text>
      </View>
      <View accessibilityLabel="정렬 기준" accessibilityRole="radiogroup" style={styles.sortControls}>
        {([
          ['score', '점수순'],
          ['visits', '방문 횟수순'],
        ] as const).map(([option, label]) => {
          const selected = sort === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onBlur={() => setFocusedSort(null)}
              onFocus={() => setFocusedSort(option)}
              onPress={() => setSort(option)}
              style={({ pressed }) => [
                styles.sortControl,
                selected && styles.sortControlSelected,
                focusedSort === option && styles.sortControlFocused,
                pressed && styles.sortControlPressed,
              ]}
            >
              <Text style={[styles.sortControlText, selected && styles.sortControlTextSelected]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.results}>
        {isLoading ? <Text style={styles.message}>식당 정보를 불러오는 중이에요.</Text> : null}
        {!isLoading && error ? (
          <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.error}>
            {error.message}
          </Text>
        ) : null}
        {!isLoading && !error && summaries.length === 0 ? (
          <Text style={styles.message}>아직 등록된 식당이 없어요.</Text>
        ) : null}
        {!isLoading && !error && wantToVisit.length > 0 ? (
          <GuideSection heading="가보고 싶은 곳" summaries={wantToVisit} onPress={(id) => router.push({
            pathname: '/restaurant/[id]',
            params: { id },
          })} />
        ) : null}
        {!isLoading && !error && visited.length > 0 ? (
          <GuideSection heading="방문한 곳" summaries={visited} onPress={(id) => router.push({
            pathname: '/restaurant/[id]',
            params: { id },
          })} />
        ) : null}
      </View>
    </Screen>
  );
}

function GuideSection({
  heading,
  summaries,
  onPress,
}: {
  heading: string;
  summaries: ReturnType<typeof getRestaurantSummaries>;
  onPress(id: string): void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{heading}</Text>
      {summaries.map((summary) => (
        <RestaurantCard
          key={summary.restaurant.id}
          restaurant={summary.restaurant}
          score={summary.score}
          visitCount={summary.visitCount}
          onPress={() => onPress(summary.restaurant.id)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: 12,
    paddingTop: 32,
  },
  title: {
    color: colors.ink,
    fontSize: 36,
    fontWeight: '800',
  },
  description: {
    color: colors.muted,
    fontSize: 17,
    lineHeight: 26,
  },
  sortControls: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
  },
  sortControl: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  sortControlSelected: {
    borderColor: colors.accent,
  },
  sortControlFocused: {
    borderColor: colors.ink,
  },
  sortControlPressed: {
    opacity: 0.75,
  },
  sortControlText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '700',
  },
  sortControlTextSelected: {
    color: colors.accent,
  },
  results: {
    gap: 12,
    marginTop: 24,
  },
  section: {
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
