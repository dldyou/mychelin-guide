import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/Screen';
import { getRestaurantSummary } from '@/src/domain/restaurantSummary';
import { DEFAULT_SCORE_POLICY } from '@/src/domain/scorePolicy';
import { useAppData } from '@/src/state/AppDataProvider';
import { colors } from '@/src/theme/colors';
import { buildRestaurantMapUrl } from '@/src/utils/mapUrl';

const daypartLabels = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  'late-night': '야식',
} as const;

const mapOpenError = '지도를 열지 못했어요. 다시 시도해 주세요.';

export default function RestaurantDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const restaurantId = typeof params.id === 'string' ? params.id : undefined;
  const router = useRouter();
  const { data, isLoading, error } = useAppData();
  const [mapError, setMapError] = useState<string | null>(null);
  const summary = restaurantId
    ? getRestaurantSummary(restaurantId, data, DEFAULT_SCORE_POLICY)
    : null;

  if (isLoading) {
    return (
      <Screen>
        <Text style={styles.message}>식당 정보를 불러오는 중이에요.</Text>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.error}>
          {error.message}
        </Text>
      </Screen>
    );
  }

  if (!summary) {
    return (
      <Screen>
        <View style={styles.section}>
          <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.error}>
            식당 정보를 찾을 수 없어요.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.secondaryButtonText}>돌아가기</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const formattedScore = summary.score === null ? '평가 전' : summary.score.toFixed(1);
  const openMap = async () => {
    setMapError(null);
    try {
      await Linking.openURL(buildRestaurantMapUrl(summary.restaurant));
    } catch {
      setMapError(mapOpenError);
    }
  };

  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.title}>{summary.restaurant.name}</Text>
          {summary.restaurant.category ? <Text style={styles.detail}>{summary.restaurant.category}</Text> : null}
          {summary.restaurant.address ? <Text style={styles.detail}>{summary.restaurant.address}</Text> : null}
          <Text style={styles.metric}>{`방문 ${summary.visitCount}회 · 개인 점수 ${formattedScore}`}</Text>
          {summary.recentChange !== null ? (
            <Text style={styles.metric}>{`최근 변화 ${summary.recentChange > 0 ? '+' : ''}${summary.recentChange.toFixed(1)}`}</Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={openMap}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.secondaryButtonText}>지도에서 열기</Text>
          </Pressable>
          {mapError ? (
            <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.error}>
              {mapError}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({
              pathname: '/share/[id]',
              params: { id: summary.restaurant.id },
            })}
            style={({ pressed }) => [styles.shareButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.shareButtonText}>공유 카드 만들기</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>메뉴</Text>
          {summary.menus.length === 0 ? <Text style={styles.message}>등록된 메뉴가 없어요.</Text> : null}
          {summary.menus.map(({ menu, ratingCount, score }) => (
            <View key={menu.id} style={styles.card}>
              <Text style={styles.label}>{menu.name}</Text>
              <Text style={styles.detail}>{`평가 ${ratingCount}회 · ${score === null ? '평가 전' : score.toFixed(1)}`}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>방문 기록</Text>
          {summary.visits.length === 0 ? <Text style={styles.message}>아직 방문 기록이 없어요.</Text> : null}
          {summary.visits.map(({ visit, score }) => (
            <View key={visit.id} style={styles.card}>
              <Text style={styles.label}>{visit.visitedAt}</Text>
              {visit.daypart ? <Text style={styles.detail}>{daypartLabels[visit.daypart]}</Text> : null}
              <Text style={styles.detail}>{`서비스 ${visit.service}점 · 분위기 ${visit.atmosphere}점`}</Text>
              <Text style={styles.detail}>{`평가 ${score === null ? '평가 전' : score.toFixed(1)}`}</Text>
              {visit.note?.trim() ? <Text style={styles.note}>{visit.note.trim()}</Text> : null}
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 24,
  },
  section: {
    gap: 12,
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '800',
  },
  heading: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '700',
  },
  label: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  metric: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  detail: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
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
  card: {
    gap: 4,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  note: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 24,
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  shareButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.accent,
  },
  shareButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.75,
  },
});
