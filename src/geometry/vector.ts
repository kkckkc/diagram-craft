import { Point } from './point.ts';

export type Vector = Point;

export const Vector = {
  from: (c1: Point, c2: Point) => {
    return { x: c2.x - c1.x, y: c2.y - c1.y };
  },
  normalize: (v: Vector) => {
    const l = Vector.length(v);
    return { x: v.x / l, y: v.y / l };
  },
  crossProduct: (v1: Vector, v2: Vector) => {
    return v1.x * v2.y - v1.y * v2.x;
  },
  angle: (v: Vector) => {
    return Math.atan2(v.y, v.x);
  },
  length: (v: Vector) => {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  },
  fromPolar: (angle: number, length: number) => {
    return { x: length * Math.cos(angle), y: length * Math.sin(angle) };
  },
  negate: (c: Vector) => ({ x: -c.x, y: -c.y }),
  scale: (c: Vector, s: number) => {
    return { x: c.x * s, y: c.y * s };
  }

  /*
  fromLine: (l: Line) => {
    return { x: l.to.x - l.from.x, y: l.to.y - l.from.y };
  },
  angle2: (v1: Vector, v2: Vector) => {
    return Vector.angle(v2) - Vector.angle(v1);
  },
  */
};
