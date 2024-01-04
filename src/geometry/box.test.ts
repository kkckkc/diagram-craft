import { describe, expect, test } from 'vitest';
import { Box } from './box.ts';

describe('Box', () => {
  test('calculates center', () => {
    expect(Box.center({ x: 0, y: 0, w: 10, h: 10, r: 0 })).toStrictEqual({
      x: 5,
      y: 5
    });
  });

  test('calculates bounding box', () => {
    expect(
      Box.boundingBox([
        { x: 0, y: 0, w: 10, h: 10, r: 0 },
        { x: 5, y: 5, w: 10, h: 10, r: 0 }
      ])
    ).toStrictEqual({ x: 0, y: 0, w: 15, h: 15, r: 0 });
  });

  test('contains point', () => {
    expect(Box.contains({ x: 0, y: 0, w: 10, h: 10, r: 0 }, { x: 5, y: 5 })).toBe(true);
  });

  test("doesn't contain point", () => {
    expect(Box.contains({ x: 0, y: 0, w: 10, h: 10, r: 0 }, { x: 15, y: 15 })).toBe(false);
  });

  test('contains point with rotated box', () => {
    expect(Box.contains({ x: 0, y: 0, w: 10, h: 10, r: Math.PI / 2 }, { x: 0, y: 5 })).toBe(true);
  });

  test("doesn't contains point with rotated box", () => {
    expect(Box.contains({ x: 0, y: 0, w: 10, h: 10, r: Math.PI / 2 }, { x: 0, y: 5.1 })).toBe(true);
  });
});
