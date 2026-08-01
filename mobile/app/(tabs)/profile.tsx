import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/Screen';
import { getProfileStats } from '@/src/domain/profileStats';
import { useAppData } from '@/src/state/AppDataProvider';
import { colors } from '@/src/theme/colors';

export default function ProfileScreen() {
  const router = useRouter();
  const [isGuideActionFocused, setIsGuideActionFocused] = useState(false);
  const { data, isLoading, error } = useAppData();
  const stats = getProfileStats(data);

  return (
    <Screen>
      <View style={styles.intro}>
        <Text style={styles.title}>프로필</Text>
      </View>
      {isLoading ? (
        <Text style={styles.message}>기록을 불러오는 중이에요.</Text>
      ) : error ? (
        <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.error}>
          {error.message}
        </Text>
      ) : (
        <View style={styles.content}>
          <View style={styles.stats}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>방문한 식당</Text>
              <Text style={styles.statValue}>{stats.visitedRestaurantCount}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>방문 기록</Text>
              <Text style={styles.statValue}>{stats.visitCount}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>메뉴 평가</Text>
              <Text style={styles.statValue}>{stats.menuRatingCount}</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            onBlur={() => setIsGuideActionFocused(false)}
            onFocus={() => setIsGuideActionFocused(true)}
            onPress={() => router.push('/guide')}
            style={({ pressed }) => [
              styles.guideAction,
              isGuideActionFocused && styles.guideActionFocused,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.guideActionText}>마이 가이드 보기</Text>
          </Pressable>
        </View>
      )}
    </Screen>
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
  content: {
    gap: 24,
    marginTop: 24,
  },
  stats: {
    gap: 12,
  },
  statCard: {
    gap: 4,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  statValue: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '800',
  },
  message: {
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
  guideAction: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.accent,
  },
  guideActionFocused: {
    borderWidth: 2,
    borderColor: colors.ink,
  },
  guideActionText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.75,
  },
});
