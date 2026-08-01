import { createId } from '../createId';

const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

describe('createId', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    if (originalCrypto) {
      Object.defineProperty(globalThis, 'crypto', originalCrypto);
    } else {
      Reflect.deleteProperty(globalThis, 'crypto');
    }
  });

  it('prefers a platform UUID when one is available', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { randomUUID: () => uuid },
    });
    jest.spyOn(Date, 'now').mockReturnValue(1_725_187_200_000);
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    expect(createId('visit')).toBe(`visit-${uuid}`);
  });

  it('formats a deterministic timestamp and random fallback when crypto is unavailable', () => {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: undefined,
    });
    jest.spyOn(Date, 'now').mockReturnValue(1_725_187_200_000);
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    expect(createId('menu')).toBe('menu-1725187200000-i');
  });
});
