import { Point } from './point';
import { CubicSegment, LineSegment, PathSegment, QuadSegment } from './pathSegment';
import {
  LengthOffsetOnPath,
  LengthOffsetOnSegment,
  PointOnPath,
  TimeOffsetOnSegment,
  WithSegment
} from './pathPosition';
import type { RawSegment } from './pathListBuilder';
import { BezierUtils } from './bezier';
import { Box } from './box';
import { assert, VERIFY_NOT_REACHED, VerifyNotReached } from '@diagram-craft/utils/assert';
import { roundHighPrecision } from '@diagram-craft/utils/math';
import { Vector } from './vector';
import { Line } from './line';
import { Lazy } from '@diagram-craft/utils/lazy';

export type Projection = { t: number; distance: number; point: Point };

class SegmentList {
  constructor(public readonly segments: PathSegment[]) {}

  static make(start: Point, path: ReadonlyArray<RawSegment>) {
    const dest: Array<PathSegment> = [];

    let end = start;

    for (const seg of path) {
      const command = seg[0];

      switch (command) {
        case 'L':
          dest.push(new LineSegment(end, { x: seg[1], y: seg[2] }));
          break;
        case 'C': {
          const [, p1x, p1y, p2x, p2y, ex, ey] = seg;
          dest.push(
            new CubicSegment(end, { x: p1x, y: p1y }, { x: p2x, y: p2y }, { x: ex, y: ey })
          );
          break;
        }
        case 'Q':
          dest.push(new QuadSegment(end, { x: seg[1], y: seg[2] }, { x: seg[3], y: seg[4] }));
          break;
        case 'T': {
          const cp = (dest.at(-1) as QuadSegment).p2!;
          const cp2 = Point.add(end, Point.subtract(end, cp));
          dest.push(new QuadSegment(end, cp2, { x: seg[1], y: seg[2] }));
          break;
        }
        case 'A': {
          const [, rx, ry, angle, larc, sweep, x2, y2] = seg;
          const cubicSegments = BezierUtils.fromArc(
            end.x,
            end.y,
            rx,
            ry,
            angle,
            larc,
            sweep,
            x2,
            y2
          );

          for (const [, p1x, p1y, p2x, p2y, ex, ey] of cubicSegments) {
            dest.push(
              new CubicSegment(end, { x: p1x, y: p1y }, { x: p2x, y: p2y }, { x: ex, y: ey })
            );
            end = { x: ex, y: ey };
          }
          break;
        }

        default:
          throw new VerifyNotReached();
      }

      end = dest.at(-1)!.end;
    }

    return new SegmentList(dest);
  }

  length() {
    return this.segments.reduce((acc, cur) => acc + cur.length(), 0);
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

    if (!bestProject) {
      return { segmentIndex: 0, t: 0, globalL: 0, distance: 0, point };
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

export class Path {
  readonly #path: RawSegment[] = [];
  readonly #segmentList;
  readonly #start: Point;

  constructor(start: Point, path: RawSegment[], segmentList?: SegmentList) {
    this.#path = path;
    this.#start = start;
    this.#segmentList = new Lazy<SegmentList>(
      () => SegmentList.make(this.start, this.#path),
      segmentList
    );
  }

  static join(...paths: Path[]) {
    const dest: RawSegment[] = [];
    for (const path of paths) {
      dest.push(...path.#path);
    }
    return new Path(paths[0].start, dest);
  }

  static from(p: Path, fn: (segments: ReadonlyArray<PathSegment>) => PathSegment[]) {
    const segmentList = new SegmentList(fn(p.segmentList.segments));
    const path = segmentList.segments.flatMap(e => e.raw());
    return new Path(p.start, path, segmentList);
  }

  private get segmentList() {
    return this.#segmentList.get();
  }

  clone() {
    return new Path(
      this.start,
      this.#path.slice().map(e => [...e]),
      this.segmentList
    );
  }

  get start() {
    return this.#start;
  }

  get end(): Point {
    return this.segmentList.segments.at(-1)!.end;
  }

  get raw() {
    return this.#path;
  }

  /*transform(t: Array<Transform>) {
    return PathListBuilder.fromSegments(this.start, this.#path)
      .withTransform(t)
      .getPaths()
      .singular();
  }*/

  get numberOfSegments() {
    return this.#segmentList.hasValue() ? this.#segmentList.get().length() : this.#path.length;
  }

  get segments(): ReadonlyArray<PathSegment> {
    return this.segmentList.segments;
  }

  reverse() {
    const end = this.end;

    const newSegmentList: PathSegment[] = [];
    const segments = SegmentList.make(this.#start, this.#path).segments;
    for (let i = segments.length - 1; i >= 0; i--) {
      newSegmentList.push(segments[i].reverse());
    }

    return new Path(
      end,
      newSegmentList.flatMap(s => s.raw())
    );
  }

  isInside(p: Point) {
    const line = new Path(p, [['L', Number.MAX_SAFE_INTEGER / 17, Number.MAX_SAFE_INTEGER / 53]]);
    const intersections = this.intersections(line);
    return intersections.length % 2 !== 0;
  }

  isOn(p: Point) {
    const pp = this.projectPoint(p);
    return Point.isEqual(pp.point, p, 0.001) && pp.segmentT >= 0 && pp.segmentT <= 1;
  }

  length() {
    return this.segmentList.length();
  }

  pointAt(t: LengthOffsetOnPath) {
    return this.segmentList.pointAt(t);
  }

  tangentAt(t: LengthOffsetOnPath) {
    return this.segmentList.tangentAt(t);
  }

  projectPoint(point: Point): PointOnPath & LengthOffsetOnPath & TimeOffsetOnSegment {
    const projection = this.segmentList.projectPoint(point);

    return {
      pathD: projection.globalL,
      segmentT: projection.t,
      point: projection.point,
      segment: projection.segmentIndex
    };
  }

  intersections(other: Path): ReadonlyArray<WithSegment<PointOnPath> & { otherSegment: number }> {
    const dest: Array<WithSegment<PointOnPath> & { otherSegment: number }> = [];

    const segments = this.segments;

    for (let idx = 0; idx < segments.length; idx++) {
      const segment = segments[idx];

      for (let oIdx = 0; oIdx < other.segments.length; oIdx++) {
        const otherSegment = other.segments[oIdx];

        const intersections = segment.intersectionsWith(otherSegment);
        if (intersections.length === 0) continue;

        dest.push(
          ...intersections.map(i => ({
            point: i.point,
            segment: idx,
            otherSegment: oIdx
          }))
        );
      }
    }

    return dest;
  }

  /**
   * Note: passing a LengthOffsetOnSegment in addition as the first parameter, gives
   * quite a bit of performance boost later on
   */
  split(
    p1: TimeOffsetOnSegment | (TimeOffsetOnSegment & LengthOffsetOnSegment),
    p2?: TimeOffsetOnSegment
  ): ReadonlyArray<Path> {
    // In case both points are on the same segment, we need to split that segment into
    // three, which is a bit complicated, as we need to calculate the length offset
    if (p2 && p1.segment === p2.segment) {
      // Note: this is a bit of a weird optimization, but it gives quite a bit of
      //       performance boost when we have already calculated the length offset on the segment
      const d1 =
        (p1 as LengthOffsetOnSegment).segmentD ?? this.segments[p1.segment].lengthAtT(p1.segmentT);

      // Split into a,b,c as follows
      //
      //          p1  p2
      //          |   |
      //        a | b | c
      // .....|---|---|---|................
      //          |   |
      // -----|---v---v---|----------|-----
      //
      // Result
      // ---------|---|--------------------
      //
      const [prefix, c] = this.segments[p2.segment].split(p2.segmentT);
      const [a, b] = prefix.split(prefix.tAtLength(d1));

      return [
        new Path(a.start, [...this.#path.slice(0, p1.segment), ...a.raw()]),
        new Path(b.start, b.raw()),
        new Path(c.start, [...c.raw(), ...this.#path.slice(p1.segment + 1)])
      ];
    }

    // Split into a,b,c,d as follows
    //
    //          p1                  p2
    //          |                   |
    //        a |   b             c | d
    // .....|---|-------|.......|--------|.....
    //          |                   |
    // -----|---v-------|-------|---v----|-----
    //
    // Result
    // ---------|-------------------|----------
    //
    const [a, b] = this.segments[p1.segment].split(p1.segmentT);

    const dest: Path[] = [new Path(this.#start, [...this.#path.slice(0, p1.segment), ...a.raw()])];
    if (p2) {
      const [c, d] = this.segments[p2.segment].split(p2.segmentT);
      dest.push(
        new Path(b.start, [...b.raw(), ...this.#path.slice(p1.segment + 1, p2.segment), ...c.raw()])
      );
      dest.push(new Path(d.start, [...d.raw(), ...this.#path.slice(p2.segment + 1)]));
    } else {
      dest.push(new Path(b.start, [...b.raw(), ...this.#path.slice(p1.segment + 1)]));
    }
    return dest;
  }

  offset(n: number) {
    // Note: this is basically the Tiller-Hanson algorithm

    // TODO: There's an opportunity to better remove cusps when offsetting
    //       bezier curves... perhaps by splitting the curves under certain conditions

    const entries: Array<{ type: 'L' | 'C'; line: Line }> = [];
    for (const segment of this.segments) {
      if (segment instanceof LineSegment) {
        entries.push({ type: 'L', line: Line.of(segment.start, segment.end) });
      } else if (segment instanceof CubicSegment) {
        entries.push({ type: 'C', line: Line.of(segment.start, segment.p1) });
        entries.push({ type: 'C', line: Line.of(segment.p1, segment.p2) });
        entries.push({ type: 'C', line: Line.of(segment.p2, segment.end) });
      } else {
        VERIFY_NOT_REACHED();
      }
    }

    // Offset all lines
    for (const entry of entries) {
      const v = Vector.normalize(Vector.from(entry.line.from, entry.line.to));
      entry.line = Line.of(
        Point.add(entry.line.from, Vector.scale(Vector.tangentToNormal(v), n)),
        Point.add(entry.line.to, Vector.scale(Vector.tangentToNormal(v), n))
      );
    }

    // Join all lines
    const joinedEntries: Array<{ type: 'L' | 'C'; line: Line }> = [];
    for (let i = 1; i < entries.length; i++) {
      const prev = entries[i - 1];
      const current = entries[i];

      const intersection = Line.intersection(prev.line, current.line, true);
      if (!intersection) {
        joinedEntries.push(prev);
      } else {
        prev.line = Line.of(prev.line.from, intersection);
        joinedEntries.push(prev);

        if (!Point.isEqual(current.line.to, intersection)) {
          current.line = Line.of(intersection, current.line.to);
        }
      }
    }
    joinedEntries.push(entries.at(-1)!);

    // For segments from the lines
    const dest: RawSegment[] = [];
    for (let i = 0; i < joinedEntries.length; i++) {
      const entry = joinedEntries[i];

      if (entry.type === 'L') {
        dest.push(['L', entry.line.to.x, entry.line.to.y]);
      } else {
        assert.true(joinedEntries[i + 1].type === 'C');
        assert.true(joinedEntries[i + 2].type === 'C');

        const p1 = joinedEntries[i].line.to;
        const p2 = joinedEntries[i + 1].line.to;
        const end = joinedEntries[i + 2].line.to;

        dest.push(['C', p1.x, p1.y, p2.x, p2.y, end.x, end.y]);

        i += 2;
      }
    }
    return new Path(joinedEntries[0].line.from, dest);
  }

  asSvgPath() {
    // Need to resolve any T-segments, as many of the QuadSegments will
    // at this point (post processing) have turned into CubicSegment and SVG
    // cannot rended a C-segment followed by a T-segment
    const normalizedPath = this.#path.find(e => e[0] === 'T')
      ? this.segments.flatMap(e => e.raw())
      : this.#path;

    return [
      `M ${roundHighPrecision(this.#start.x)},${roundHighPrecision(this.#start.y)}`,
      ...normalizedPath.map(r => {
        // We know the first element of a raw segment is the command, followed
        // by a number of numbers
        const [command, ...numbers] = r;

        const roundedNumbers = numbers.map(e => roundHighPrecision(e));
        return `${command} ${roundedNumbers.join(',')}`;
      })
    ].join(' ');
  }

  bounds() {
    const boxes = this.segments.map(s => s.bounds());
    return Box.boundingBox(boxes);
  }

  clean() {
    // Remove any repeated segments
    const dest: RawSegment[] = [this.#path[0]];
    for (let i = 1; i < this.#path.length; i++) {
      const current = this.#path[i];
      const previous = this.#path[i - 1];

      if (current.every((e, idx) => e === previous[idx])) continue;
      dest.push(current);
    }

    return new Path(this.#start, dest);
  }

  isClockwise() {
    const segments = this.segments;
    let sum = 0;
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      const next = segments[(i + 1) % segments.length];
      sum += (next.start.x - s.start.x) * (-next.start.y - s.start.y);
    }

    return sum < 0;
  }
}
