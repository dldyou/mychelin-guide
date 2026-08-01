import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/Screen';
import { colors } from '@/src/theme/colors';

export default function GuideScreen() {
  return (
    <Screen>
      <View style={styles.intro}>
        <Text style={styles.title}>마이 가이드</Text>
        <Text style={styles.description}>
          내가 기록한 식당을 점수와 방문 횟수로 정리할 예정이에요.
        </Text>
      </View>
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
  description: {
    color: colors.muted,
    fontSize: 17,
    lineHeight: 26,
  },
});
