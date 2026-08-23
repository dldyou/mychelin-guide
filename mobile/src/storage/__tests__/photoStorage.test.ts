import * as FileSystem from 'expo-file-system/legacy';

import { createId } from '../../utils/createId';
import {
  copyPhotosToAppStorage,
  deleteAppOwnedPhotos,
} from '../photoStorage';

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///documents/',
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

jest.mock('../../utils/createId', () => ({ createId: jest.fn() }));

const mockedCreateId = jest.mocked(createId);
const mockedMakeDirectory = jest.mocked(FileSystem.makeDirectoryAsync);
const mockedCopy = jest.mocked(FileSystem.copyAsync);
const mockedDelete = jest.mocked(FileSystem.deleteAsync);

describe('photoStorage', () => {
  beforeEach(() => {
    mockedCreateId.mockReturnValueOnce('photo-one').mockReturnValueOnce('photo-two');
    mockedMakeDirectory.mockResolvedValue();
    mockedCopy.mockResolvedValue();
    mockedDelete.mockResolvedValue();
  });

  afterEach(() => jest.resetAllMocks());

  test('copies picked photos into the app document directory and preserves extensions', async () => {
    await expect(copyPhotosToAppStorage([
      'file:///picker/meal.JPG?edited=1',
      'content://picker/image-without-extension',
    ])).resolves.toEqual([
      'file:///documents/visit-photos/photo-one.jpg',
      'file:///documents/visit-photos/photo-two.jpg',
    ]);

    expect(mockedMakeDirectory).toHaveBeenCalledWith(
      'file:///documents/visit-photos/',
      { intermediates: true },
    );
    expect(mockedCopy).toHaveBeenNthCalledWith(1, {
      from: 'file:///picker/meal.JPG?edited=1',
      to: 'file:///documents/visit-photos/photo-one.jpg',
    });
  });

  test('removes completed copies when a later copy fails', async () => {
    mockedCopy.mockResolvedValueOnce().mockRejectedValueOnce(new Error('copy failed'));

    await expect(copyPhotosToAppStorage(['file:///one.png', 'file:///two.png']))
      .rejects.toThrow('copy failed');

    expect(mockedDelete).toHaveBeenCalledWith(
      'file:///documents/visit-photos/photo-one.png',
      { idempotent: true },
    );
  });

  test('deletes only generated direct children of the visit photo directory', async () => {
    await deleteAppOwnedPhotos([
      'file:///documents/visit-photos/photo-one.jpg',
      'file:///picker/external.jpg',
      'file:///documents/visit-photos/../private.db',
      'file:///documents/visit-photos/nested/photo-two.jpg',
      'file:///documents/visit-photos/%2e%2e/private.db',
      'file:///documents/visit-photos/photo-safe.jpg%2f..%2fprivate.db',
      'file:///documents/visit-photos/photo-safe.jpg%2Fprivate.db',
    ]);

    expect(mockedDelete).toHaveBeenCalledTimes(1);
    expect(mockedDelete).toHaveBeenCalledWith(
      'file:///documents/visit-photos/photo-one.jpg',
      { idempotent: true },
    );
  });
});
