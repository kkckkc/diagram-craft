import { describe, expect, test } from 'vitest';
import { BezierUtils } from './bezier';

describe('BezierUtils', () => {
  test('calculates center', () => {
    expect(BezierUtils.fromArc(100, 100, 30, 50, 0, 0, 1, 162.55, 162.45)).toStrictEqual([
      [
        'C',
        114.42221014085034,
        59.874156707148636,
        149.49859121679208,
        60.81633871164263,
        163.13748593029655,
        101.69592762589153
      ],
      [
        'C',
        169.46731878154637,
        120.66821022579973,
        169.24337041623195,
        143.82753157144174,
        162.55,
        162.45
      ]
    ]);
  });
});
