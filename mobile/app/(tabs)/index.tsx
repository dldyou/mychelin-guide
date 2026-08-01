import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { RestaurantCard } from '@/src/components/RestaurantCard';
import { Screen } from '@/src/components/Screen';
import {
  getRecentRestaurantSummaries,
  getRestaurantSummaries,
  sortRestaurantSummaries,
} from '@/src/domain/restaurantSummary';
import { DEFAULT_SCORE_POLICY } from '@/src/domain/scorePolicy';
import { useAppData } from '@/src/state/AppDataProvider';
import { colors } from '@/src/theme/colors';

export default function HomeScreen() {
  const router = useRouter();
  const { data, isLoading, error } = useAppData();
  const summaries = getRestaurantSummaries(data, DEFAULT_SCORE_POLICY);
  const recent = getRecentRestaurantSummaries(summaries, 3);
  const frequent = sortRestaurantSummaries(summaries, 'visits')
    .filter(({ visitCount }) => visitCount > 0)
    .slice(0, 3);
  const highScore = sortRestaurantSummaries(summaries, 'score')
    .filter(({ score }) => score !== null)
    .slice(0, 3);

  return (
    <Screen>
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>MYCHELIN GUIDE</Text>
        <Text style={styles.title}>홈</Text>
        <Text style={styles.description}>
          최근 방문과 자주 찾는 식당을 한눈에 확인할 수 있어요.
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/restaurant/search')}
        style={({ pressed }) => [styles.primaryAction, pressed && styles.buttonPressed]}
      >
        <Text style={styles.primaryActionText}>방문 기록하기</Text>
      </Pressable>
      {isLoading ? <Text style={styles.statusMessage}>기록을 불러오는 중이에요.</Text> : null}
      {error ? (
        <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.error}>
          {error.message}
        </Text>
      ) : null}
      {!isLoading && !error ? (
        <View style={styles.sections}>
          <View style={styles.section}>
            <Text style={styles.heading}>최근 방문</Text>
            {recent.length === 0 ? <Text style={styles.message}>방문 기록을 추가해 보세요.</Text> : null}
            {recent.map((summary) => (
              <RestaurantCard
                key={summary.restaurant.id}
                restaurant={summary.restaurant}
                score={summary.score}
                visitCount={summary.visitCount}
                onPress={() => router.push({
                  pathname: '/restaurant/[id]',
                  params: { id: summary.restaurant.id },
                })}
              />
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.heading}>자주 찾는 식당</Text>
            {frequent.length === 0 ? <Text style={styles.message}>방문 기록을 추가해 보세요.</Text> : null}
            {frequent.map((summary) => (
              <RestaurantCard
                key={summary.restaurant.id}
                restaurant={summary.restaurant}
                score={summary.score}
                visitCount={summary.visitCount}
                onPress={() => router.push({
                  pathname: '/restaurant/[id]',
                  params: { id: summary.restaurant.id },
                })}
              />
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.heading}>높은 개인 점수</Text>
            {highScore.length === 0 ? <Text style={styles.message}>방문 기록을 추가해 보세요.</Text> : null}
            {highScore.map((summary) => (
              <RestaurantCard
                key={summary.restaurant.id}
                restaurant={summary.restaurant}
                score={summary.score}
                visitCount={summary.visitCount}
                onPress={() => router.push({
                  pathname: '/restaurant/[id]',
                  params: { id: summary.restaurant.id },
                })}
              />
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: 12,
    paddingTop: 32,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
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
  primaryAction: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.accent,
  },
  primaryActionText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  sections: {
    gap: 24,
    marginTop: 32,
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
  statusMessage: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 24,
  },
  error: {
    color: colors.accent,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 24,
  },
  buttonPressed: {
    opacity: 0.75,
  },
});
