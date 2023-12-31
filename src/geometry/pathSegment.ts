import { Point } from './point.ts';
import { Vector } from './vector.ts';
import { Line } from './line.ts';
import { CubicBezier } from './bezier.ts';
import { RawSegment } from './pathBuilder.ts';
import { Projection } from './path.ts';
import { LengthOffsetOnPath } from './pathPosition.ts';

//type NormalizedSegment = RawCubicSegment | RawQuadSegment | RawLineSegment;

export interface PathSegment {
  length(): number;
  point(t: number): Point;
  intersectionsWith(other: PathSegment): Point[] | undefined;
  projectPoint(point: Point): Projection;
  raw(): RawSegment[];
  split(t: number): [PathSegment, PathSegment];
  tAtLength(length: number): number;
  lengthAtT(t: number): number;
  tangent(t: number): Vector;
  //tangentAt(t: number): Vector;
  //normalAt(t: number): Vector;
  //boundingBox(): Box;
  //splitAt(t: number): [PathSegment, PathSegment];
  //project(p: Point): { t: number, distance: number };

  //normalize(): NormalizedSegment[];

  start: Point;
  end: Point;
}

export class LineSegment implements PathSegment {
  constructor(
    public readonly start: Point,
    public readonly end: Point
  ) {}

  raw(): RawSegment[] {
    return [['L', this.end.x, this.end.y]];
  }

  split(t: number): [PathSegment, PathSegment] {
    const p = this.point(t);
    return [new LineSegment(this.start, p), new LineSegment(p, this.end)];
  }

  tAtLength(length: number): number {
    return length / this.length();
  }

  lengthAtT(t: number): number {
    return this.length() * t;
  }

  projectPoint(point: Point): Projection {
    const v = Vector.from(this.start, this.end);
    const w = Vector.from(this.start, point);

    // Calculate dot product
    const c1 = w.x * v.x + w.y * v.y;
    const c2 = v.x * v.x + v.y * v.y;

    const t = c1 / c2;

    const projection = Point.add(this.start, Vector.scale(v, t));
    const distance = Point.distance(point, projection);

    return {
      t,
      distance,
      point: projection
    };
  }

  intersectionsWith(other: PathSegment): Point[] | undefined {
    if (other instanceof LineSegment) {
      const p = Line.intersection(Line.of(this.start, this.end), Line.of(other.start, other.end));
      if (p) return [p];
      return undefined;
    } else {
      return other.intersectionsWith(this);
    }
  }

  length() {
    return Point.distance(this.start, this.end);
  }

  point(t: number) {
    return {
      x: this.start.x + (this.end.x - this.start.x) * t,
      y: this.start.y + (this.end.y - this.start.y) * t
    };
  }

  tangent(_t: number) {
    return Vector.normalize(Vector.from(this.start, this.end));
  }

  /*normalize(): NormalizedSegment[] {
    return [['L', this.end.x, this.end.y]];
  }*/
}

export class CubicSegment extends CubicBezier implements PathSegment {
  constructor(
    public readonly start: Point,
    public readonly p1: Point,
    private readonly p2: Point,
    public readonly end: Point
  ) {
    super(start, p1, p2, end);
  }

  split(t: number): [CubicSegment, CubicSegment] {
    const b = super.split(t);
    return [
      new CubicSegment(b[0].start, b[0].cp1, b[0].cp2, b[0].end),
      new CubicSegment(b[1].start, b[1].cp1, b[1].cp2, b[1].end)
    ];
  }

  raw(): RawSegment[] {
    return [['C', this.p1.x, this.p1.y, this.p2.x, this.p2.y, this.end.x, this.end.y]];
  }

  intersectionsWith(other: PathSegment): Point[] | undefined {
    if (other instanceof LineSegment) {
      return super.intersectsLine(Line.of(other.start, other.end));
    } else if (other instanceof CubicSegment) {
      return super.intersectsBezier(other);
    } else {
      return other.intersectionsWith(this);
    }
  }

  /*normalize(): NormalizedSegment[] {
    return [['C', this.p1.x, this.p1.y, this.p2.x, this.p2.y, this.end.x, this.end.y]];
  }*/
}

export const makeCurveSegment = (start: Point, end: Point, previous: QuadSegment): CubicSegment => {
  const p = start;
  const cp = previous.p1!;
  const cp2 = Point.add(p, Point.subtract(p, cp));

  return new QuadSegment(start, cp2, end);
};

export class QuadSegment extends CubicSegment {
  quadP1: Point;

  constructor(
    public readonly start: Point,
    public readonly p1: Point,
    public readonly end: Point
  ) {
    super(
      start,
      {
        x: (1 / 3) * start.x + (2 / 3) * p1.x,
        y: (1 / 3) * start.y + (2 / 3) * p1.y
      },
      {
        x: (2 / 3) * p1.x + (1 / 3) * end.x,
        y: (2 / 3) * p1.y + (1 / 3) * end.y
      },
      end
    );
    this.quadP1 = p1;
  }

  /*normalize(): NormalizedSegment[] {
    return [['Q', this.p1.x, this.p1.y, this.end.x, this.end.y]];
  }*/
}

// TODO: Do we really need the ArcSegment
/*
export class ArcSegment implements PathSegment {
  private _normalized: RawCubicSegment[] | undefined;
  private _segmentList: SegmentList | undefined;

  constructor(
    public readonly start: Point,
    private readonly rx: number,
    private readonly ry: number,
    private readonly angle: number,
    private readonly large_arc_flag: 0 | 1,
    private readonly sweep_flag: 0 | 1,
    public readonly end: Point
  ) {}

  asRawSegments(): RawSegment[] {
    return this.segmentList.segments.flatMap(s => s.asRawSegments()) ?? [];
  }

  length(): number {
    return this.segmentList.length();
  }

  point(t: number): Point {
    return this.segmentList.point(t);
  }

  split(_t: number): [PathSegment, PathSegment] {
    // TODO: Implement this - maybe this can be implemented without looking at the bezier curves
    //       essentially by creating a new arc with new bezier curves
    throw new NotImplementedYet();
  }

  tAtLength(l: number): number {
    // find segment that contains the point
    let currentL = l;
    let segmentIndex = 0;
    let segment = this.segmentList.segments[segmentIndex];
    while (currentL > segment.length()) {
      currentL -= segment.length();
      segment = this.segmentList.segments[++segmentIndex];
    }

    return segment.tAtLength(currentL);
  }

  lengthAtT(_t: number): number {
    // TODO: Implement this - maybe this can be implemented without looking at the bezier curves
    //       essentially by creating a new arc with new bezier curves
    throw new NotImplementedYet();
  }

  intersectionsWith(other: PathSegment): Point[] | undefined {
    const dest: Point[] = [];

    for (const segment of this.segmentList.segments) {
      const intersections = segment.intersectionsWith(other);
      if (intersections) {
        dest.push(...intersections);
      }
    }

    return dest;
  }

  tangent(_t: number): Vector {
    throw new NotImplementedYet();
  }

  normalize(): RawCubicSegment[] {
    if (this._normalized) return this._normalized;

    this._normalized = BezierUtils.fromArc(
      this.start.x,
      this.start.y,
      this.rx,
      this.ry,
      this.angle,
      this.large_arc_flag,
      this.sweep_flag,
      this.end.x,
      this.end.y
    );

    return this._normalized;
  }

  projectPoint(point: Point): Projection {
    const projection = this.segmentList.projectPoint(point);
    projection.t = projection.globalL / this.length();
    return projection;
  }

  private get segmentList() {
    if (this._segmentList) return this._segmentList;

    this._segmentList = new SegmentList(
      this.normalize().map(
        c =>
          new CubicSegment(
            this.start,
            { x: c[1], y: c[2] },
            { x: c[3], y: c[4] },
            { x: c[5], y: c[6] }
          )
      )
    );
    return this._segmentList;
  }
}

 */

export class SegmentList {
  constructor(public readonly segments: PathSegment[]) {}

  length() {
    return this.segments.reduce((acc, cur) => acc + cur.length(), 0) ?? 0;
  }

  // TODO: This is incorrect
  point(t: number) {
    const totalLength = this.length();
    return this.pointAt({ pathD: t * totalLength });
  }

  pointAt(t: LengthOffsetOnPath) {
    // Find the segment that contains the point
    let currentD = t.pathD;
    let segmentIndex = 0;
    let segment = this.segments[segmentIndex];
    while (currentD > segment.length()) {
      currentD -= segment.length();
      segment = this.segments[++segmentIndex];
    }

    // TODO: This is a bit incorrect, we should probably use tAtLength here
    return segment.point(currentD / segment.length());
  }

  tangentAt(t: LengthOffsetOnPath) {
    // Find the segment that contains the point
    let currentD = t.pathD;
    let segmentIndex = 0;
    let segment = this.segments[segmentIndex];
    while (currentD > segment.length()) {
      currentD -= segment.length();
      segment = this.segments[++segmentIndex];
    }

    // TODO: This is a bit incorrect, we should probably use tAtLength here
    return segment.tangent(currentD / segment.length());
  }

  projectPoint(point: Point): Projection & { segmentIndex: number; globalL: number } {
    let bestSegment = -1;
    let bestProject: Projection | undefined;
    let bestDistance = Number.MAX_VALUE;
    const segments = this.segments;
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      const projection = s.projectPoint(point);
      if (projection.distance < bestDistance) {
        bestProject = projection;
        bestDistance = projection.distance;
        bestSegment = i;
      }
    }

    const l = this.segments.slice(0, bestSegment).reduce((acc, cur) => acc + cur.length(), 0);
    return {
      segmentIndex: bestSegment,
      t: bestProject!.t,

      // TODO: Should we really return this back here - as it's a bit expensive to calculate
      globalL: l + this.segments[bestSegment].lengthAtT(bestProject!.t),
      distance: bestProject!.distance,
      point: bestProject!.point
    };
  }
}
