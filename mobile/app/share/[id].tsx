import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/Screen';
import { getRestaurantSummary } from '@/src/domain/restaurantSummary';
import { DEFAULT_SCORE_POLICY } from '@/src/domain/scorePolicy';
import { createRestaurantShareText } from '@/src/domain/shareText';
import { useAppData } from '@/src/state/AppDataProvider';
import { colors } from '@/src/theme/colors';

export default function RestaurantShareScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const restaurantId = typeof params.id === 'string' ? params.id : undefined;
  const router = useRouter();
  const { data, isLoading, error } = useAppData();
  const summary = restaurantId
    ? getRestaurantSummary(restaurantId, data, DEFAULT_SCORE_POLICY)
    : null;
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const sharingRef = useRef(false);

  if (isLoading) {
    return (
      <Screen>
        <Text style={styles.message}>공유 정보를 불러오는 중이에요.</Text>
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
        <View style={styles.content}>
          <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.error}>
            공유할 식당 정보를 찾을 수 없어요.
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

  const message = createRestaurantShareText(summary);

  const share = async () => {
    if (sharingRef.current) return;
    sharingRef.current = true;
    setIsSharing(true);
    setShareError(null);
    try {
      await Share.share({ message });
    } catch {
      setShareError('공유를 시작하지 못했어요. 다시 시도해 주세요.');
    } finally {
      sharingRef.current = false;
      setIsSharing(false);
    }
  };

  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.preview}>
          <Text style={styles.previewText}>{message}</Text>
        </View>

        {shareError ? (
          <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.error}>
            {shareError}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isSharing }}
          disabled={isSharing}
          onPress={share}
          style={({ pressed }) => [
            styles.shareButton,
            isSharing && styles.buttonDisabled,
            pressed && !isSharing && styles.buttonPressed,
          ]}
        >
          <Text style={styles.shareButtonText}>{isSharing ? '공유 중...' : '공유하기'}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  preview: {
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  previewText: {
    color: colors.ink,
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
    minHeight: 52,
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
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.75,
  },
});
