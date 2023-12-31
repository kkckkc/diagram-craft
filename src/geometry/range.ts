export type Range = [number, number];

export const Range = {
  of: (from: number, to: number): Range => {
    return [from, to];
  },

  overlaps: (r1: Range, r2: Range) => {
    return r1[0] <= r2[1] && r2[0] <= r1[1];
  },

  intersection: (r1: Range, r2: Range): Range | undefined => {
    if (!Range.overlaps(r1, r2)) return undefined;

    return Range.of(Math.max(r1[0], r2[0]), Math.min(r1[1], r2[1]));
  },

  midpoint: (r: Range): number => {
    return (r[0] + r[1]) / 2;
  },

  add: (r: Range, d: number): Range => {
    return [r[0] + d, r[1] + d];
  }
};
