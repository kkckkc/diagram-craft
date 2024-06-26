import { describe, expect, test } from 'vitest';
import { Extent } from './extent';

describe('Extent', () => {
  test('isEqual', () => {
    expect(Extent.isEqual(Extent.of(1, 2), Extent.of(1, 2))).toBe(true);
    expect(Extent.isEqual(Extent.of(1, 2), Extent.of(1, 3))).toBe(false);
    expect(Extent.isEqual(Extent.of(1, 2), Extent.of(2, 2))).toBe(false);
  });

  test('of', () => {
    expect(Extent.of(1, 2)).toStrictEqual({ w: 1, h: 2 });
  });
});
