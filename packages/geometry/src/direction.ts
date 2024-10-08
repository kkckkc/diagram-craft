import { Point } from './point';
import { Angle } from './angle';

export type Direction = 'n' | 's' | 'w' | 'e';
export function assertDirection(value: string): asserts value is Direction {
  if (!['n', 's', 'e', 'w'].includes(value)) {
    throw new Error(`Invalid direction: ${value}`);
  }
}

export type FullDirection = 'north' | 'south' | 'west' | 'east';
export function assertFullDirection(value: string): asserts value is FullDirection {
  if (!['north', 'south', 'east', 'west'].includes(value)) {
    throw new Error(`Invalid direction: ${value}`);
  }
}
export function assertFullDirectionOrUndefined(
  value: string | undefined
): asserts value is FullDirection | undefined {
  if (value !== undefined && !['north', 'south', 'east', 'west'].includes(value)) {
    throw new Error(`Invalid direction: ${value}`);
  }
}

export const Direction = {
  opposite(d: Direction): Direction {
    switch (d) {
      case 'n':
        return 's';
      case 's':
        return 'n';
      case 'w':
        return 'e';
      case 'e':
        return 'w';
    }
  },
  all: (): ReadonlyArray<Direction> => {
    return ['n', 's', 'w', 'e'];
  },
  fromVector: (p: Point): Direction => {
    if (Math.abs(p.x) > Math.abs(p.y)) {
      return p.x < 0 ? 'w' : 'e';
    } else {
      return p.y < 0 ? 'n' : 's';
    }
  },
  fromAngle: (angle: number, inverted = false): Direction => {
    const a = Angle.normalize(angle);

    if (a > Math.PI / 4 && a < (3 * Math.PI) / 4) {
      return inverted ? 's' : 'n';
    } else if (a > (3 * Math.PI) / 4 && a < (5 * Math.PI) / 4) {
      return 'w';
    } else if (a > (5 * Math.PI) / 4 && a < (7 * Math.PI) / 4) {
      return inverted ? 'n' : 's';
    } else {
      return 'e';
    }
  },
  toAngle: (d: Direction, inverted = false): number => {
    switch (d) {
      case 'n':
        return inverted ? (3 * Math.PI) / 2 : Math.PI / 2;
      case 's':
        return inverted ? Math.PI / 2 : (3 * Math.PI) / 2;
      case 'w':
        return Math.PI;
      case 'e':
        return 0;
    }
  }
};
