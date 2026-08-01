import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/Screen';
import { colors } from '@/src/theme/colors';

export default function HomeScreen() {
  const router = useRouter();

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
  buttonPressed: {
    opacity: 0.75,
  },
});
