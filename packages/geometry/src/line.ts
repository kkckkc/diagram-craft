import { Point } from './point';
import { Range } from './range';
import { Vector } from './vector';
import { round } from '@diagram-craft/utils/math';

export type Line = Readonly<{
  from: Point;
  to: Point;
}>;

export const Line = {
  extend: (line: Line, fromLength: number, toLength: number) => {
    const v = Vector.from(line.from, line.to);
    const unit = Vector.scale(v, 1 / Math.sqrt(v.x * v.x + v.y * v.y));
    if (isNaN(unit.x) || isNaN(unit.y)) return line;
    return {
      from: Point.subtract(line.from, Vector.scale(unit, fromLength)),
      to: Point.add(line.to, Vector.scale(unit, toLength))
    };
  },

  vertical: (x: number, range: Range) => {
    return Line.of({ x, y: range[0] }, { x, y: range[1] });
  },

  horizontal: (y: number, range: Range) => {
    return Line.of({ y, x: range[0] }, { y, x: range[1] });
  },

  of: (from: Point, to: Point) => {
    return { from, to };
  },

  midpoint: (line: Line) => {
    return Point.midpoint(line.from, line.to);
  },

  move: (line: Line, delta: Vector) => {
    return Line.of(Point.add(line.from, delta), Point.add(line.to, delta));
  },

  isHorizontal: (line: Line) => {
    return round(line.from.y) === round(line.to.y);
  },

  intersection: (l1: Line, l2: Line, extend = false) => {
    const t =
      ((l1.from.x - l2.from.x) * (l2.from.y - l2.to.y) -
        (l1.from.y - l2.from.y) * (l2.from.x - l2.to.x)) /
      ((l1.from.x - l1.to.x) * (l2.from.y - l2.to.y) -
        (l1.from.y - l1.to.y) * (l2.from.x - l2.to.x));
    const u =
      ((l1.from.x - l2.from.x) * (l1.from.y - l1.to.y) -
        (l1.from.y - l2.from.y) * (l1.from.x - l1.to.x)) /
      ((l1.from.x - l1.to.x) * (l2.from.y - l2.to.y) -
        (l1.from.y - l1.to.y) * (l2.from.x - l2.to.x));

    if (isNaN(t) || isNaN(u)) return undefined;
    if (!extend && (t < 0 || t > 1 || u < 0 || u > 1)) return undefined;

    return { x: l1.from.x + t * (l1.to.x - l1.from.x), y: l1.from.y + t * (l1.to.y - l1.from.y) };
  },

  length(l: Line) {
    return Vector.length(Vector.from(l.from, l.to));
  },

  projectPoint(l: Line, p: Point) {
    const v = Vector.from(l.from, l.to);
    const w = Vector.from(l.from, p);
    const c1 = Vector.dotProduct(w, v);
    if (c1 <= 0) return l.from;
    const c2 = Vector.dotProduct(v, v);
    if (c2 <= c1) return l.to;
    const b = c1 / c2;
    return Point.add(l.from, Vector.scale(v, b));
  }
};
