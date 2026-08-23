import * as FileSystem from 'expo-file-system/legacy';

import { createId } from '../utils/createId';

const photoDirectory = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}visit-photos/`
  : null;
const photoFileName = /^photo-[a-z0-9-]+\.[a-z0-9]{1,10}$/i;

const extensionFor = (uri: string) =>
  uri.match(/\.([a-z0-9]{1,10})(?:[?#]|$)/i)?.[1].toLowerCase() ?? 'jpg';

export const deleteAppOwnedPhotos = async (uris: string[]): Promise<void> => {
  if (!photoDirectory) return;
  await Promise.all(uris
    .filter((uri) => uri.startsWith(photoDirectory)
      && photoFileName.test(uri.slice(photoDirectory.length)))
    .map((uri) => FileSystem.deleteAsync(uri, { idempotent: true })));
};

export const copyPhotosToAppStorage = async (uris: string[]): Promise<string[]> => {
  if (uris.length === 0) return [];
  if (!photoDirectory) throw new Error('사진 저장소를 사용할 수 없습니다.');

  await FileSystem.makeDirectoryAsync(photoDirectory, { intermediates: true });
  const copiedUris: string[] = [];
  try {
    for (const uri of uris) {
      const destination = `${photoDirectory}${createId('photo')}.${extensionFor(uri)}`;
      await FileSystem.copyAsync({ from: uri, to: destination });
      copiedUris.push(destination);
    }
    return copiedUris;
  } catch (cause) {
    try {
      await deleteAppOwnedPhotos(copiedUris);
    } catch {
      // Preserve the copy error; any completed copies are already best-effort cleanup.
    }
    throw cause;
  }
};
