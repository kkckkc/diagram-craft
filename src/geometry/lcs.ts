import { NOT_IMPLEMENTED_YET } from '../utils/assert.ts';
import { Box } from './box.ts';
import { Rotation } from './transform.ts';
import { Point } from './point.ts';
import { Extent } from './extent.ts';

export class LocalCoordinateSystem {
  static UNITY = new LocalCoordinateSystem({ x: 0, y: 0 }, { w: 1, h: 1 }, 0);

  static fromBox(box: Box) {
    if (
      Point.isEqual(Point.ORIGIN, box.pos) &&
      box.rotation === 0 &&
      box.size.w === 1 &&
      box.size.h === 1
    )
      return this.UNITY;
    return new LocalCoordinateSystem(box.pos, box.size, box.rotation);
  }

  constructor(
    private readonly origin: Point,
    private readonly extent: Extent,
    private readonly rotation: number
  ) {}

  toGlobal(c: Box): Box;
  toGlobal(c: Point): Point;
  toGlobal(c: Box | Point): Box | Point {
    // TODO: Need to use translation when needed
    if (this.origin !== this.origin) NOT_IMPLEMENTED_YET();
    if (this.extent !== this.extent) NOT_IMPLEMENTED_YET();
    if ('pos' in c) return new Rotation(this.rotation).apply(c);
    return new Rotation(this.rotation).apply(c);
  }

  toLocal(c: Box): Box;
  toLocal(c: Point): Point;
  toLocal(c: Box | Point): Box | Point {
    // TODO: Need to use translation when needed
    if (this.origin !== this.origin) NOT_IMPLEMENTED_YET();
    if (this.extent !== this.extent) NOT_IMPLEMENTED_YET();
    if ('pos' in c) return new Rotation(-this.rotation).apply(c);
    return new Rotation(-this.rotation).apply(c);
  }
}
