import { Point } from './point.ts';
import {
  ArcSegment,
  CubicSegment,
  LineSegment,
  makeCurveSegment,
  PathSegment,
  QuadSegment,
  SegmentList
} from './pathSegment.ts';
import { VerifyNotReached } from '../utils/assert.ts';
import {
  LengthOffsetOnPath,
  LengthOffsetOnSegment,
  PointOnPath,
  TimeOffsetOnSegment,
  WithSegment
} from './pathPosition.ts';
import { Segment } from './pathBuilder.ts';

export type Projection = { t: number; distance: number; point: Point };

const makeSegmentList = (start: Point, path: ReadonlyArray<Segment>) => {
  const dest: PathSegment[] = [];

  let end = start;

  for (const seg of path) {
    const command = seg[0];

    let s: PathSegment;
    switch (command) {
      case 'L':
        s = new LineSegment(end, { x: seg[1], y: seg[2] });
        break;
      case 'C':
        s = new CubicSegment(
          end,
          { x: seg[1], y: seg[2] },
          { x: seg[3], y: seg[4] },
          { x: seg[5], y: seg[6] }
        );
        break;
      case 'Q':
        s = new QuadSegment(end, { x: seg[1], y: seg[2] }, { x: seg[3], y: seg[4] });
        break;
      case 'T':
        s = makeCurveSegment(end, { x: seg[1], y: seg[2] }, dest.at(-1)! as QuadSegment);
        break;
      case 'A':
        // TODO: Remove this ts-ignore
        // @ts-ignore
        s = new ArcSegment(end, seg[1], seg[2], seg[3], seg[4], seg[5], {
          x: seg[6],
          y: seg[7]
        });
        break;

      default:
        throw new VerifyNotReached();
    }
    dest.push(s);
    end = s.end;
  }

  return new SegmentList(dest);
};

// TODO: I wonder if we should create the segmentList immediately and not keep the path around
export class Path {
  private path: Segment[] = [];
  private readonly start: Point;

  #segmentList: SegmentList | undefined;

  constructor(path: Segment[], start: Point) {
    this.path = path;
    this.start = start;
  }

  private get segmentList() {
    if (this.#segmentList) return this.#segmentList;
    this.#segmentList = makeSegmentList(this.start, this.path);
    return this.#segmentList;
  }

  get segments(): ReadonlyArray<PathSegment> {
    return this.segmentList.segments;
  }

  processSegments(fn: (segments: ReadonlyArray<PathSegment>) => PathSegment[]) {
    this.#segmentList = new SegmentList(fn(this.segmentList.segments));
    this.path = this.#segmentList.segments.flatMap(e => e.asRawSegments());
  }

  length() {
    return this.segmentList.length();
  }

  lengthTo(idx: number) {
    return this.segments.slice(0, idx).reduce((acc, cur) => acc + cur.length(), 0);
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

  intersections(other: Path): ReadonlyArray<WithSegment<PointOnPath>> {
    const dest: WithSegment<PointOnPath>[] = [];

    const segments = this.segments;
    for (let idx = 0; idx < segments.length; idx++) {
      const segment = segments[idx];
      for (const otherSegment of other.segments) {
        const intersections = segment.intersectionsWith(otherSegment);
        if (intersections) {
          dest.push(
            ...intersections.map(i => {
              return {
                point: i,
                segment: idx
              };
            })
          );
        }
      }
    }

    return dest;
  }

  split(p1: TimeOffsetOnSegment, p2?: TimeOffsetOnSegment): ReadonlyArray<Path> {
    const dest: Path[] = [];

    if (p2 && p1.segment === p2.segment) {
      // TODO: This seems a bit expensive to calulcate the length and then back to offset
      //       ... maybe we can split into three immediately
      //       ... or perhaps a separate method called cut, which skips the middle part
      // Note: this is a bit of a weird optimization, but it gives quite a bit of
      //       performance boost when we have already calculated the length offset on the segment
      // TODO: Maybe we should move this logic into lengthAtT
      const d1 =
        (p1 as unknown as LengthOffsetOnSegment)?.segmentD ??
        this.segments[p1.segment].lengthAtT(p1.segmentT);

      const [prefix, end] = this.segments[p2.segment].split(p2.segmentT);
      const [start, mid] = prefix.split(prefix.tAtLength(d1));
      dest.push(
        new Path([...this.path.slice(0, p1.segment), ...start.asRawSegments()], this.start)
      );
      dest.push(new Path(mid.asRawSegments(), mid.start));
      dest.push(new Path([...end.asRawSegments(), ...this.path.slice(p1.segment + 1)], end.start));
      return dest;
    }

    const startSegments = this.segments[p1.segment].split(p1.segmentT);

    dest.push(
      new Path([...this.path.slice(0, p1.segment), ...startSegments[0].asRawSegments()], this.start)
    );
    if (p2) {
      const endSegments = p2 ? this.segments[p2.segment].split(p2.segmentT) : [];
      dest.push(
        new Path(
          [
            ...startSegments[1].asRawSegments(),
            ...this.path.slice(p1.segment + 1, p2.segment),
            ...endSegments[0].asRawSegments()
          ],
          startSegments[1].start
        )
      );
      dest.push(
        new Path(
          [...endSegments[1].asRawSegments(), ...this.path.slice(p2.segment + 1)],
          endSegments[1].start
        )
      );
    } else {
      dest.push(
        new Path(
          [...startSegments[1].asRawSegments(), ...this.path.slice(p1.segment + 1)],
          startSegments[1].start
        )
      );
    }
    return dest;
  }

  asSvgPath(normalized = false) {
    if (normalized) {
      return (
        `M ${this.start.x} ${this.start.y} ` +
        this.segments
          .map(e => e.normalize())
          .flat()
          .map(e => e.join(' '))
          .join(' ')
      );
    } else {
      return `M ${this.start.x} ${this.start.y} ` + this.path.map(e => e.join(' ')).join(' ');
    }
  }
}
