import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { RatingRow } from '@/src/components/RatingRow';
import { Screen } from '@/src/components/Screen';
import { type NewVisitInput, useAppData } from '@/src/state/AppDataProvider';
import { colors } from '@/src/theme/colors';
import { createId } from '@/src/utils/createId';

type MenuRatingDraft = {
  key: string;
  menuId?: string;
  menuName?: string;
  taste: number | null;
  value: number | null;
};

type Daypart = NonNullable<NewVisitInput['daypart']>;

const DAYPARTS: Array<{ value: Daypart; label: string }> = [
  { value: 'breakfast', label: '아침' },
  { value: 'lunch', label: '점심' },
  { value: 'dinner', label: '저녁' },
  { value: 'late-night', label: '야식' },
];

export default function NewVisitScreen() {
  const params = useLocalSearchParams<{ restaurantId?: string | string[] }>();
  const restaurantId = Array.isArray(params.restaurantId) ? params.restaurantId[0] : params.restaurantId;
  const router = useRouter();
  const { data, isLoading, error, addVisit } = useAppData();
  const restaurant = data.restaurants.find(({ id }) => id === restaurantId);
  const menus = data.menus.filter((menu) => menu.restaurantId === restaurantId);
  const [daypart, setDaypart] = useState<Daypart | null>(null);
  const [service, setService] = useState<number | null>(null);
  const [atmosphere, setAtmosphere] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<MenuRatingDraft[]>([]);
  const [newMenuName, setNewMenuName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canSave = Boolean(restaurantId)
    && service !== null
    && atmosphere !== null
    && drafts.length > 0
    && drafts.every(({ menuId, menuName, taste, value }) =>
      Boolean(menuId || menuName?.trim()) && taste !== null && value !== null)
    && !isSaving;

  const addExistingMenu = (menuId: string) => {
    setDrafts((current) => current.some((draft) => draft.menuId === menuId)
      ? current
      : [...current, { key: `menu-${menuId}`, menuId, taste: null, value: null }]);
  };

  const addNewMenu = () => {
    const menuName = newMenuName.trim();
    if (!menuName) return;
    setDrafts((current) => [
      ...current,
      { key: createId('menu-draft'), menuName, taste: null, value: null },
    ]);
    setNewMenuName('');
  };

  const updateDraft = (key: string, change: Partial<MenuRatingDraft>) => {
    setDrafts((current) => current.map((draft) => draft.key === key ? { ...draft, ...change } : draft));
  };

  const pickPhotos = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setFormError('사진 접근 권한이 필요합니다.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
      });
      if (!result.canceled) {
        setPhotoUris((current) => [
          ...new Set([...current, ...result.assets.map(({ uri }) => uri)]),
        ]);
        setFormError(null);
      }
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : '사진을 선택하지 못했습니다.');
    }
  };

  const submit = async () => {
    if (!canSave || !restaurantId) return;

    setIsSaving(true);
    setFormError(null);
    try {
      await addVisit({
        restaurantId,
        visitedAt: new Date().toISOString(),
        daypart: daypart ?? undefined,
        service: service!,
        atmosphere: atmosphere!,
        note: note.trim() || undefined,
        photoUris,
        menuRatings: drafts.map(({ menuId, menuName, taste, value }) => ({
          menuId,
          menuName: menuName?.trim(),
          taste: taste!,
          value: value!,
        })),
      });
      router.replace('/(tabs)');
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : '방문 기록을 저장하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Screen>
        <Text style={styles.message}>음식점 정보를 불러오는 중이에요.</Text>
      </Screen>
    );
  }

  if (!restaurant) {
    return (
      <Screen>
        <View style={styles.form}>
          <Text
            accessibilityLiveRegion="assertive"
            accessibilityRole="alert"
            style={styles.error}
          >
            {error?.message ?? '음식점을 찾을 수 없습니다.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/restaurant/search')}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.secondaryButtonText}>음식점 검색으로 돌아가기</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.form}>
        <View style={styles.section}>
          <Text style={styles.title}>{restaurant.name}</Text>
          <Text style={styles.message}>이번 방문을 기록해 보세요.</Text>
        </View>

        <View accessibilityLabel="방문 시간대" accessibilityRole="radiogroup" style={styles.section}>
          <Text style={styles.heading}>방문 시간대</Text>
          <View style={styles.choiceRow}>
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: daypart === null }}
              onPress={() => setDaypart(null)}
              style={({ pressed }) => [
                styles.choice,
                daypart === null && styles.choiceSelected,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={[styles.choiceText, daypart === null && styles.choiceTextSelected]}>
                미선택
              </Text>
            </Pressable>
            {DAYPARTS.map((option) => {
              const selected = daypart === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => setDaypart(option.value)}
                  style={({ pressed }) => [
                    styles.choice,
                    selected && styles.choiceSelected,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>메뉴 평가</Text>
          <Text style={styles.label}>기존 메뉴 추가</Text>
          {menus.length === 0 ? <Text style={styles.message}>등록된 메뉴가 없습니다.</Text> : null}
          <View style={styles.menuChoices}>
            {menus.map((menu) => {
              const selected = drafts.some(({ menuId }) => menuId === menu.id);
              return (
                <Pressable
                  key={menu.id}
                  accessibilityLabel={`${menu.name} 메뉴 추가`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: selected }}
                  disabled={selected}
                  onPress={() => addExistingMenu(menu.id)}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    selected && styles.buttonDisabled,
                    pressed && !selected && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>{selected ? `${menu.name} 추가됨` : menu.name}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.addMenuRow}>
            <TextInput
              accessibilityLabel="새 메뉴 이름"
              onChangeText={setNewMenuName}
              onSubmitEditing={addNewMenu}
              placeholder="새 메뉴 이름"
              placeholderTextColor={colors.muted}
              returnKeyType="done"
              style={[styles.input, styles.addMenuInput]}
              value={newMenuName}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !newMenuName.trim() }}
              disabled={!newMenuName.trim()}
              onPress={addNewMenu}
              style={({ pressed }) => [
                styles.addButton,
                !newMenuName.trim() && styles.buttonDisabled,
                pressed && newMenuName.trim() && styles.buttonPressed,
              ]}
            >
              <Text style={styles.addButtonText}>추가</Text>
            </Pressable>
          </View>

          {drafts.map((draft) => {
            const menu = menus.find(({ id }) => id === draft.menuId);
            return (
              <View key={draft.key} style={styles.ratingCard}>
                {draft.menuId ? (
                  <Text style={styles.heading}>{menu?.name}</Text>
                ) : (
                  <TextInput
                    accessibilityLabel="평가할 새 메뉴 이름"
                    onChangeText={(menuName) => updateDraft(draft.key, { menuName })}
                    placeholder="메뉴 이름"
                    placeholderTextColor={colors.muted}
                    style={styles.input}
                    value={draft.menuName}
                  />
                )}
                <RatingRow
                  label="맛"
                  value={draft.taste}
                  onChange={(taste) => updateDraft(draft.key, { taste })}
                />
                <RatingRow
                  label="가성비"
                  value={draft.value}
                  onChange={(value) => updateDraft(draft.key, { value })}
                />
                <Pressable
                  accessibilityLabel={`${menu?.name ?? draft.menuName ?? '메뉴'} 평가 삭제`}
                  accessibilityRole="button"
                  onPress={() => setDrafts((current) => current.filter(({ key }) => key !== draft.key))}
                  style={({ pressed }) => [styles.removeButton, pressed && styles.buttonPressed]}
                >
                  <Text style={styles.removeButtonText}>평가 삭제</Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>방문 평가</Text>
          <RatingRow label="서비스" value={service} onChange={setService} />
          <RatingRow label="분위기" value={atmosphere} onChange={setAtmosphere} />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>메모</Text>
          <TextInput
            accessibilityLabel="방문 메모"
            multiline
            onChangeText={setNote}
            placeholder="방문에 대한 메모를 남겨 보세요."
            placeholderTextColor={colors.muted}
            style={[styles.input, styles.noteInput]}
            textAlignVertical="top"
            value={note}
          />
        </View>

        <View style={styles.section}>
          <Pressable
            accessibilityRole="button"
            onPress={pickPhotos}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.secondaryButtonText}>사진 추가</Text>
          </Pressable>
          {photoUris.length > 0 ? (
            <Text accessibilityLiveRegion="polite" style={styles.message}>사진 {photoUris.length}장 선택됨</Text>
          ) : null}
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
          onPress={submit}
          style={({ pressed }) => [
            styles.submitButton,
            !canSave && styles.buttonDisabled,
            pressed && canSave && styles.buttonPressed,
          ]}
        >
          <Text style={styles.submitButtonText}>{isSaving ? '저장 중...' : '방문 기록 저장'}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
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
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choice: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  choiceSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  choiceText: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  choiceTextSelected: {
    color: '#FFFFFF',
  },
  menuChoices: {
    gap: 8,
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
  addMenuRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addMenuInput: {
    flex: 1,
  },
  addButton: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: colors.accent,
  },
  addButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 16,
  },
  noteInput: {
    minHeight: 120,
  },
  ratingCard: {
    gap: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  removeButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  submitButton: {
    minHeight: 52,
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
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.75,
  },
});
