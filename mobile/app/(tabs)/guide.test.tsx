import { act, create } from 'react-test-renderer';

import GuideScreen from './guide';
import { useAppData } from '@/src/state/AppDataProvider';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/src/state/AppDataProvider', () => ({ useAppData: jest.fn() }));

const mockedUseAppData = jest.mocked(useAppData);

describe('GuideScreen', () => {
  it('separates saved restaurants from visited restaurants', async () => {
    mockedUseAppData.mockReturnValue({
      data: {
        restaurants: [
          { id: 'saved', name: 'Saved', createdAt: '2026-08-01T00:00:00.000Z' },
          { id: 'visited', name: 'Visited', createdAt: '2026-08-01T00:00:00.000Z' },
        ],
        menus: [],
        visits: [{
          id: 'visit-1',
          restaurantId: 'visited',
          visitedAt: '2026-08-02T00:00:00.000Z',
          service: 4,
          atmosphere: 4,
          photoUris: [],
        }],
        menuRatings: [],
      },
      isLoading: false,
      error: null,
      addRestaurant: jest.fn(),
      addMenu: jest.fn(),
      addVisit: jest.fn(),
    });

    let tree!: ReturnType<typeof create>;
    await act(async () => { tree = create(<GuideScreen />); });

    expect(JSON.stringify(tree.toJSON())).toContain('가보고 싶은 곳');
    expect(JSON.stringify(tree.toJSON())).toContain('방문한 곳');
  });
});
