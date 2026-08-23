import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { File as ExpoFile, Paths } from 'expo-file-system';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/src/components/Screen';
import type { AppData } from '@/src/domain/appData';
import { getProfileStats } from '@/src/domain/profileStats';
import { useAppData } from '@/src/state/AppDataProvider';
import { parseAppDataBackup, serializeAppDataBackup } from '@/src/storage/appStorage';
import { colors } from '@/src/theme/colors';

export default function ProfileScreen() {
  const router = useRouter();
  const [isGuideActionFocused, setIsGuideActionFocused] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const { data, isLoading, error, replaceData } = useAppData();
  const stats = getProfileStats(data);

  const exportBackup = async () => {
    setIsTransferring(true);
    try {
      if (!await Sharing.isAvailableAsync()) {
        Alert.alert('내보낼 수 없음', '이 기기에서는 파일 공유를 사용할 수 없습니다.');
        return;
      }
      const file = new ExpoFile(Paths.cache, `mychelin-backup-${new Date().toISOString().slice(0, 10)}.json`);
      file.create({ overwrite: true });
      file.write(serializeAppDataBackup(data));
      await Sharing.shareAsync(file.uri, {
        dialogTitle: 'MYCHELIN 기록 내보내기',
        mimeType: 'application/json',
        UTI: 'public.json',
      });
    } catch {
      Alert.alert('내보내기 실패', '백업 파일을 만들 수 없습니다. 다시 시도해 주세요.');
    } finally {
      setIsTransferring(false);
    }
  };

  const confirmImport = async (importedData: AppData) => {
    setIsTransferring(true);
    try {
      await replaceData(importedData);
      Alert.alert('가져오기 완료', '사진을 제외한 기록을 가져왔습니다.');
    } catch {
      Alert.alert('가져오기 실패', '현재 기록은 변경되지 않았습니다. 다시 시도해 주세요.');
    } finally {
      setIsTransferring(false);
    }
  };

  const importBackup = async () => {
    setIsTransferring(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const document = asset.file ? await asset.file.text() : await new ExpoFile(asset.uri).text();
      const importedData = parseAppDataBackup(document);
      Alert.alert(
        '기록 교체',
        '현재 기록을 선택한 백업으로 교체할까요? 가져온 사진 연결은 모두 제거됩니다.',
        [
          { text: '취소', style: 'cancel' },
          { text: '교체', style: 'destructive', onPress: () => { void confirmImport(importedData); } },
        ],
      );
    } catch {
      Alert.alert('가져오기 실패', '올바른 MYCHELIN 백업 파일이 아닙니다. 현재 기록은 변경되지 않았습니다.');
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <Screen>
      <View style={styles.intro}>
        <Text style={styles.title}>프로필</Text>
      </View>
      {isLoading ? (
        <Text style={styles.message}>기록을 불러오는 중이에요.</Text>
      ) : error ? (
        <View style={styles.errorContent}>
          <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.error}>
            {error.message}
          </Text>
          <View style={styles.backupCard}>
            <Text style={styles.backupTitle}>백업으로 복구</Text>
            <Text style={styles.backupDescription}>
              올바른 JSON 백업을 가져오면 현재 기록을 교체할 수 있어요. 가져온 사진 연결은 제거됩니다.
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={isTransferring}
              onPress={() => { void importBackup(); }}
              style={({ pressed }) => [
                styles.backupAction,
                (pressed || isTransferring) && styles.buttonPressed,
              ]}
            >
              <Text style={styles.backupActionText}>백업 가져오기</Text>
            </Pressable>
          </View>
        </View>
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
          <View style={styles.backupCard}>
            <Text style={styles.backupTitle}>기록 백업</Text>
            <Text style={styles.backupDescription}>
              JSON 파일로 기록을 옮길 수 있어요. 사진은 백업에 포함되지 않으며, 가져온 사진 연결도 제거됩니다.
            </Text>
            <View style={styles.backupActions}>
              <Pressable
                accessibilityRole="button"
                disabled={isTransferring}
                onPress={() => { void exportBackup(); }}
                style={({ pressed }) => [
                  styles.backupAction,
                  (pressed || isTransferring) && styles.buttonPressed,
                ]}
              >
                <Text style={styles.backupActionText}>기록 내보내기</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isTransferring}
                onPress={() => { void importBackup(); }}
                style={({ pressed }) => [
                  styles.backupAction,
                  (pressed || isTransferring) && styles.buttonPressed,
                ]}
              >
                <Text style={styles.backupActionText}>기록 가져오기</Text>
              </Pressable>
            </View>
          </View>
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
  },
  errorContent: {
    gap: 24,
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
  backupCard: {
    gap: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  backupTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  backupDescription: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  backupActions: {
    gap: 8,
  },
  backupAction: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: 12,
  },
  backupActionText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.75,
  },
});
