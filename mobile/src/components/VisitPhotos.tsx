import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

export function VisitPhotos({
  photoUris,
  onRemove,
}: {
  photoUris: string[];
  onRemove?(uri: string): void;
}) {
  const [preview, setPreview] = useState<{ uri: string; index: number } | null>(null);

  if (photoUris.length === 0) return null;

  return (
    <View style={styles.gallery}>
      {photoUris.map((uri, index) => (
        <View key={`${uri}-${index}`} style={styles.photo}>
          <Pressable
            accessibilityLabel={`방문 사진 ${index + 1} 크게 보기`}
            accessibilityRole="button"
            onPress={() => setPreview({ uri, index })}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Image accessible={false} source={{ uri }} style={styles.thumbnail} />
          </Pressable>
          {onRemove ? (
            <Pressable
              accessibilityLabel={`방문 사진 ${index + 1} 삭제`}
              accessibilityRole="button"
              onPress={() => onRemove(uri)}
              style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
            >
              <Text style={styles.removeText}>삭제</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      <Modal
        animationType="fade"
        onRequestClose={() => setPreview(null)}
        transparent
        visible={preview !== null}
      >
        <View accessibilityViewIsModal style={styles.previewBackdrop}>
          {preview ? (
            <Image
              accessibilityLabel={`확대한 방문 사진 ${preview.index + 1}`}
              resizeMode="contain"
              source={{ uri: preview.uri }}
              style={styles.previewImage}
            />
          ) : null}
          <Pressable
            accessibilityLabel="사진 크게 보기 닫기"
            accessibilityRole="button"
            onPress={() => setPreview(null)}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Text style={styles.closeText}>닫기</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photo: {
    gap: 4,
  },
  thumbnail: {
    width: 112,
    height: 112,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  removeButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  previewBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  previewImage: {
    width: '100%',
    flex: 1,
  },
  closeButton: {
    minWidth: 96,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  closeText: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.75,
  },
});
