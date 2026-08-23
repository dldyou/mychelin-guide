import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/src/components/Screen';
import { useAppData } from '@/src/state/AppDataProvider';
import { colors } from '@/src/theme/colors';

export default function RestaurantRegisterScreen() {
  const router = useRouter();
  const { addRestaurant } = useAppData();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const canSave = name.trim().length > 0 && !isSaving;

  const submit = async (recordVisit: boolean) => {
    if (!canSave) return;

    setIsSaving(true);
    setFormError(null);
    try {
      const restaurant = await addRestaurant({
        name: name.trim(),
        category: category.trim() || undefined,
        address: address.trim() || undefined,
      });
      router.replace(recordVisit
        ? { pathname: '/visit/new', params: { restaurantId: restaurant.id } }
        : { pathname: '/restaurant/[id]', params: { id: restaurant.id } });
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : '식당을 저장하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen>
      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>식당 이름</Text>
          <TextInput
            accessibilityLabel="식당 이름 입력"
            onChangeText={setName}
            placeholder="식당 이름"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={name}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>분류</Text>
          <TextInput
            accessibilityLabel="식당 분류 입력"
            onChangeText={setCategory}
            placeholder="예: 한식"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={category}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>주소</Text>
          <TextInput
            accessibilityLabel="식당 주소 입력"
            onChangeText={setAddress}
            placeholder="주소"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={address}
          />
        </View>

        {formError ? (
          <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.error}>
            {formError}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave }}
          disabled={!canSave}
          onPress={() => submit(true)}
          style={({ pressed }) => [
            styles.submitButton,
            !canSave && styles.buttonDisabled,
            pressed && canSave && styles.buttonPressed,
          ]}
        >
          <Text style={styles.submitButtonText}>{isSaving ? '저장 중...' : '등록 후 방문 기록하기'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSave }}
          disabled={!canSave}
          onPress={() => submit(false)}
          style={({ pressed }) => [
            styles.laterButton,
            !canSave && styles.buttonDisabled,
            pressed && canSave && styles.buttonPressed,
          ]}
        >
          <Text style={styles.laterButtonText}>가보고 싶은 곳에 저장</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 20,
  },
  field: {
    gap: 8,
  },
  label: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 16,
  },
  error: {
    color: colors.accent,
    fontSize: 16,
    lineHeight: 24,
  },
  submitButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.accent,
  },
  submitButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  laterButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  laterButtonText: {
    color: colors.accent,
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
