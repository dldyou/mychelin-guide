import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/Screen';
import { colors } from '@/src/theme/colors';

export default function ProfileScreen() {
  return (
    <Screen>
      <View style={styles.intro}>
        <Text style={styles.title}>프로필</Text>
        <Text style={styles.description}>
          나의 기록 통계와 공유 기능을 확인할 예정이에요.
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
