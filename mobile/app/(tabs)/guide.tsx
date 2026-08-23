import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { RestaurantCard } from '@/src/components/RestaurantCard';
import { Screen } from '@/src/components/Screen';
import {
  type RestaurantSummarySort,
  type RestaurantStatusFilter,
  filterRestaurantSummaries,
  getRestaurantSummaries,
  sortRestaurantSummaries,
} from '@/src/domain/restaurantSummary';
import { DEFAULT_SCORE_POLICY } from '@/src/domain/scorePolicy';
import { useAppData } from '@/src/state/AppDataProvider';
import { colors } from '@/src/theme/colors';

export default function GuideScreen() {
  const router = useRouter();
  const [sort, setSort] = useState<RestaurantSummarySort>('score');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<RestaurantStatusFilter>('all');
  const [focusedSort, setFocusedSort] = useState<RestaurantSummarySort | null>(null);
  const { data, isLoading, error } = useAppData();
  const allSummaries = getRestaurantSummaries(data, DEFAULT_SCORE_POLICY);
  const summaries = sortRestaurantSummaries(
    filterRestaurantSummaries(allSummaries, { query, category, status }),
    sort,
  );
  const hasActiveFilters = query.trim() !== '' || category.trim() !== '' || status !== 'all';
  const wantToVisit = summaries.filter(({ visitCount }) => visitCount === 0);
  const visited = summaries.filter(({ visitCount }) => visitCount > 0);

  const clearFilters = () => {
    setQuery('');
    setCategory('');
    setStatus('all');
  };

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
      <View style={styles.filters}>
        <TextInput
          accessibilityLabel="식당 이름 검색"
          placeholder="식당 이름 검색"
          placeholderTextColor={colors.muted}
          style={styles.textFilter}
          value={query}
          onChangeText={setQuery}
        />
        <TextInput
          accessibilityLabel="카테고리 필터"
          placeholder="카테고리 필터"
          placeholderTextColor={colors.muted}
          style={styles.textFilter}
          value={category}
          onChangeText={setCategory}
        />
        <View accessibilityLabel="방문 상태" accessibilityRole="radiogroup" style={styles.statusControls}>
          {([
            ['all', '전체'],
            ['want-to-visit', '가보고 싶은 곳'],
            ['visited', '방문한 곳'],
          ] as const).map(([option, label]) => (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: status === option }}
              onPress={() => setStatus(option)}
              style={[styles.statusControl, status === option && styles.statusControlSelected]}
            >
              <Text style={[styles.statusControlText, status === option && styles.statusControlTextSelected]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        {hasActiveFilters ? (
          <Pressable accessibilityRole="button" onPress={clearFilters} style={styles.clearFilters}>
            <Text style={styles.clearFiltersText}>필터 초기화</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.results}>
        {isLoading ? <Text style={styles.message}>식당 정보를 불러오는 중이에요.</Text> : null}
        {!isLoading && error ? (
          <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.error}>
            {error.message}
          </Text>
        ) : null}
        {!isLoading && !error && allSummaries.length === 0 ? (
          <Text style={styles.message}>아직 등록된 식당이 없어요.</Text>
        ) : null}
        {!isLoading && !error && allSummaries.length > 0 && summaries.length === 0 ? (
          <Text style={styles.message}>조건에 맞는 식당이 없어요.</Text>
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
  filters: {
    gap: 8,
    marginTop: 16,
  },
  textFilter: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    color: colors.ink,
    fontSize: 16,
    paddingHorizontal: 12,
  },
  statusControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusControl: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
  statusControlSelected: {
    borderColor: colors.accent,
  },
  statusControlText: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '700',
  },
  statusControlTextSelected: {
    color: colors.accent,
  },
  clearFilters: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  clearFiltersText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
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
