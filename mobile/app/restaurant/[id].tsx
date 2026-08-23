import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { RatingRow } from '@/src/components/RatingRow';
import { Screen } from '@/src/components/Screen';
import type { Restaurant } from '@/src/domain/appData';
import { getRestaurantSummary } from '@/src/domain/restaurantSummary';
import type { VisitSummary } from '@/src/domain/restaurantSummary';
import { DEFAULT_SCORE_POLICY } from '@/src/domain/scorePolicy';
import { useAppData } from '@/src/state/AppDataProvider';
import { colors } from '@/src/theme/colors';

const daypartLabels = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  'late-night': '야식',
} as const;

type Daypart = keyof typeof daypartLabels;

const daypartOptions: Array<{ value: Daypart | undefined; label: string }> = [
  { value: undefined, label: '미선택' },
  { value: 'breakfast', label: '아침' },
  { value: 'lunch', label: '점심' },
  { value: 'dinner', label: '저녁' },
  { value: 'late-night', label: '야식' },
];

const confirmDestructiveAction = (title: string, message: string, action: () => void) => {
  if (Platform.OS === 'web') {
    if (globalThis.confirm(`${title}\n\n${message}`)) action();
    return;
  }
  Alert.alert(title, message, [
    { text: '취소', style: 'cancel' },
    { text: '삭제', style: 'destructive', onPress: action },
  ]);
};

export default function RestaurantDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const restaurantId = typeof params.id === 'string' ? params.id : undefined;
  const router = useRouter();
  const { data, isLoading, error, deleteRestaurant } = useAppData();
  const [editingRestaurant, setEditingRestaurant] = useState(false);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

  if (error && !summary) {
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

  const confirmRestaurantDelete = () => {
    confirmDestructiveAction(
      '식당 삭제',
      `${summary.restaurant.name}과 등록된 메뉴를 삭제할까요?`,
      () => {
        setIsDeleting(true);
        setDeleteError(null);
        deleteRestaurant(summary.restaurant.id).then(() => {
          router.replace('/(tabs)/guide');
        }).catch((cause) => {
          setDeleteError(cause instanceof Error ? cause.message : '식당을 삭제하지 못했습니다.');
        }).finally(() => {
          setIsDeleting(false);
        });
      },
    );
  };

  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.section}>
          {editingRestaurant ? (
            <RestaurantEditor
              restaurant={summary.restaurant}
              onCancel={() => setEditingRestaurant(false)}
            />
          ) : (
            <>
              <Text style={styles.title}>{summary.restaurant.name}</Text>
              {summary.restaurant.category ? <Text style={styles.detail}>{summary.restaurant.category}</Text> : null}
              {summary.restaurant.address ? <Text style={styles.detail}>{summary.restaurant.address}</Text> : null}
              <Pressable
                accessibilityLabel={`${summary.restaurant.name} 식당 정보 수정`}
                accessibilityRole="button"
                onPress={() => setEditingRestaurant(true)}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
              >
                <Text style={styles.secondaryButtonText}>식당 정보 수정</Text>
              </Pressable>
            </>
          )}
          <Text style={styles.metric}>{`방문 ${summary.visitCount}회 · 개인 점수 ${formattedScore}`}</Text>
          {summary.recentChange !== null ? (
            <Text style={styles.metric}>{`최근 변화 ${summary.recentChange > 0 ? '+' : ''}${summary.recentChange.toFixed(1)}`}</Text>
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
          {deleteError ? (
            <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.error}>
              {deleteError}
            </Text>
          ) : null}
          <Pressable
            accessibilityHint={summary.visitCount > 0 ? '방문 기록을 먼저 삭제해야 합니다.' : undefined}
            accessibilityRole="button"
            accessibilityState={{ disabled: summary.visitCount > 0 || isDeleting }}
            disabled={summary.visitCount > 0 || isDeleting}
            onPress={confirmRestaurantDelete}
            style={({ pressed }) => [
              styles.dangerButton,
              (summary.visitCount > 0 || isDeleting) && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.dangerButtonText}>{isDeleting ? '삭제 중...' : '식당 삭제'}</Text>
          </Pressable>
          {summary.visitCount > 0 ? (
            <Text style={styles.message}>식당을 삭제하려면 방문 기록을 먼저 삭제해 주세요.</Text>
          ) : null}
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
          {summary.visits.map((visitSummary) => editingVisitId === visitSummary.visit.id ? (
            <VisitEditor
              key={visitSummary.visit.id}
              onCancel={() => setEditingVisitId(null)}
              visitSummary={visitSummary}
            />
          ) : (
            <View key={visitSummary.visit.id} style={styles.card}>
              <Text style={styles.label}>{visitSummary.visit.visitedAt}</Text>
              {visitSummary.visit.daypart ? <Text style={styles.detail}>{daypartLabels[visitSummary.visit.daypart]}</Text> : null}
              <Text style={styles.detail}>{`서비스 ${visitSummary.visit.service}점 · 분위기 ${visitSummary.visit.atmosphere}점`}</Text>
              <Text style={styles.detail}>{`평가 ${visitSummary.score === null ? '평가 전' : visitSummary.score.toFixed(1)}`}</Text>
              {visitSummary.visit.note?.trim() ? <Text style={styles.note}>{visitSummary.visit.note.trim()}</Text> : null}
              <Pressable
                accessibilityLabel={`${visitSummary.visit.visitedAt} 방문 기록 수정`}
                accessibilityRole="button"
                onPress={() => setEditingVisitId(visitSummary.visit.id)}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
              >
                <Text style={styles.secondaryButtonText}>방문 기록 수정</Text>
              </Pressable>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

function RestaurantEditor({ restaurant, onCancel }: { restaurant: Restaurant; onCancel(): void }) {
  const { updateRestaurant } = useAppData();
  const [name, setName] = useState(restaurant.name);
  const [category, setCategory] = useState(restaurant.category ?? '');
  const [address, setAddress] = useState(restaurant.address ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const canSave = Boolean(name.trim()) && !isSaving;

  const submit = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setFormError(null);
    try {
      await updateRestaurant(restaurant.id, {
        name: name.trim(),
        category: category.trim() || undefined,
        address: address.trim() || undefined,
      });
      onCancel();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : '식당 정보를 저장하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View accessibilityLabel="식당 정보 수정" style={styles.editor}>
      <Text style={styles.heading}>식당 정보 수정</Text>
      <TextInput accessibilityLabel="식당 이름 입력" onChangeText={setName} style={styles.input} value={name} />
      <TextInput accessibilityLabel="식당 분류 입력" onChangeText={setCategory} placeholder="분류" placeholderTextColor={colors.muted} style={styles.input} value={category} />
      <TextInput accessibilityLabel="식당 주소 입력" onChangeText={setAddress} placeholder="주소" placeholderTextColor={colors.muted} style={styles.input} value={address} />
      {formError ? <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.error}>{formError}</Text> : null}
      <View style={styles.actionRow}>
        <Pressable accessibilityRole="button" onPress={onCancel} style={({ pressed }) => [styles.secondaryButton, styles.flexButton, pressed && styles.buttonPressed]}>
          <Text style={styles.secondaryButtonText}>취소</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canSave }} disabled={!canSave} onPress={submit} style={({ pressed }) => [styles.shareButton, styles.flexButton, !canSave && styles.buttonDisabled, pressed && styles.buttonPressed]}>
          <Text style={styles.shareButtonText}>{isSaving ? '저장 중...' : '저장'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function VisitEditor({ visitSummary, onCancel }: { visitSummary: VisitSummary; onCancel(): void }) {
  const { updateVisit, deleteVisit } = useAppData();
  const { visit } = visitSummary;
  const [visitedAt, setVisitedAt] = useState(visit.visitedAt);
  const [daypart, setDaypart] = useState<Daypart | undefined>(visit.daypart);
  const [service, setService] = useState(visit.service);
  const [atmosphere, setAtmosphere] = useState(visit.atmosphere);
  const [note, setNote] = useState(visit.note ?? '');
  const [ratings, setRatings] = useState(() => visitSummary.menuRatings.map(({ rating, menu }) => ({
    ...rating,
    menuName: menu.name,
  })));
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const canSave = Boolean(visitedAt.trim()) && !isSaving;
  const updateRating = (id: string, change: { taste?: number; value?: number }) => {
    setRatings((current) => current.map((rating) => rating.id === id ? { ...rating, ...change } : rating));
  };

  const submit = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setFormError(null);
    try {
      await updateVisit({
        id: visit.id,
        visitedAt: visitedAt.trim(),
        daypart,
        service,
        atmosphere,
        note: note.trim() || undefined,
        menuRatings: ratings.map(({ id, taste, value }) => ({ id, taste, value })),
      });
      onCancel();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : '방문 기록을 저장하지 못했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = () => confirmDestructiveAction(
    '방문 기록 삭제',
    `${visit.visitedAt} 방문 기록과 메뉴 평가를 삭제할까요?`,
    () => {
      setIsSaving(true);
      setFormError(null);
      deleteVisit(visit.id).then(onCancel).catch((cause) => {
        setFormError(cause instanceof Error ? cause.message : '방문 기록을 삭제하지 못했습니다.');
      }).finally(() => {
        setIsSaving(false);
      });
    },
  );

  return (
    <View accessibilityLabel="방문 기록 수정" style={styles.card}>
      <Text style={styles.heading}>방문 기록 수정</Text>
      <Text style={styles.label}>방문 날짜</Text>
      <TextInput accessibilityLabel="방문 날짜 입력" autoCapitalize="none" onChangeText={setVisitedAt} style={styles.input} value={visitedAt} />
      <View accessibilityLabel="방문 시간대" accessibilityRole="radiogroup" style={styles.choiceRow}>
        {daypartOptions.map((option) => {
          const selected = daypart === option.value;
          return (
            <Pressable key={option.label} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => setDaypart(option.value)} style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && styles.buttonPressed]}>
              <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <RatingRow label="서비스" value={service} onChange={setService} />
      <RatingRow label="분위기" value={atmosphere} onChange={setAtmosphere} />
      {ratings.map((rating) => (
        <View key={rating.id} style={styles.ratingEditor}>
          <Text style={styles.label}>{rating.menuName}</Text>
          <RatingRow label="맛" value={rating.taste} onChange={(taste) => updateRating(rating.id, { taste })} />
          <RatingRow label="가성비" value={rating.value} onChange={(value) => updateRating(rating.id, { value })} />
        </View>
      ))}
      <TextInput accessibilityLabel="방문 메모 입력" multiline onChangeText={setNote} placeholder="메모" placeholderTextColor={colors.muted} style={[styles.input, styles.noteInput]} value={note} />
      {formError ? <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.error}>{formError}</Text> : null}
      <View style={styles.actionRow}>
        <Pressable accessibilityRole="button" onPress={onCancel} style={({ pressed }) => [styles.secondaryButton, styles.flexButton, pressed && styles.buttonPressed]}>
          <Text style={styles.secondaryButtonText}>취소</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canSave }} disabled={!canSave} onPress={submit} style={({ pressed }) => [styles.shareButton, styles.flexButton, !canSave && styles.buttonDisabled, pressed && styles.buttonPressed]}>
          <Text style={styles.shareButtonText}>{isSaving ? '저장 중...' : '저장'}</Text>
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: isSaving }} disabled={isSaving} onPress={confirmDelete} style={({ pressed }) => [styles.dangerButton, isSaving && styles.buttonDisabled, pressed && styles.buttonPressed]}>
        <Text style={styles.dangerButtonText}>방문 기록 삭제</Text>
      </Pressable>
    </View>
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
  editor: {
    gap: 12,
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
  noteInput: {
    minHeight: 96,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  flexButton: {
    flex: 1,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choice: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
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
    fontSize: 15,
    fontWeight: '700',
  },
  choiceTextSelected: {
    color: colors.background,
  },
  ratingEditor: {
    gap: 8,
    paddingTop: 8,
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
  dangerButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  dangerButtonText: {
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
