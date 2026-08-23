import { buildRestaurantMapUrl } from '../mapUrl';

describe('buildRestaurantMapUrl', () => {
  it('searches the trimmed address and name with URL encoding', () => {
    expect(buildRestaurantMapUrl({ name: '  카페 & 베이커리  ', address: ' 서울시 종로구 / 1 ' })).toBe(
      'https://www.google.com/maps/search/?api=1&query=%EC%84%9C%EC%9A%B8%EC%8B%9C%20%EC%A2%85%EB%A1%9C%EA%B5%AC%20%2F%201%20%EC%B9%B4%ED%8E%98%20%26%20%EB%B2%A0%EC%9D%B4%EC%BB%A4%EB%A6%AC',
    );
  });

  it('falls back to the restaurant name when no address is stored', () => {
    expect(buildRestaurantMapUrl({ name: '카페', address: '   ' })).toBe(
      'https://www.google.com/maps/search/?api=1&query=%EC%B9%B4%ED%8E%98',
    );
  });
});
