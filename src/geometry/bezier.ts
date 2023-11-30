import { Point } from './point.ts';
import { RawCubicSegment } from './pathBuilder.ts';
import { Box } from './box.ts';
import { smallestIndex } from '../utils/array.ts';
import { Line } from './line.ts';
import { round } from '../utils/math.ts';

const PI = Math.PI;
const _120 = (PI * 120) / 180;

const rotate = (x: number, y: number, rad: number): Point => {
  return { x: x * Math.cos(rad) - y * Math.sin(rad), y: x * Math.sin(rad) + y * Math.cos(rad) };
};

// See https://pomax.github.io/bezierinfo/legendre-gauss.html
// using n=25
const W = [
  0.1231760537267154, 0.12224244299031, 0.12224244299031, 0.1194557635357848, 0.1194557635357848,
  0.1148582591457116, 0.1148582591457116, 0.1085196244742637, 0.1085196244742637,
  0.1005359490670506, 0.1005359490670506, 0.0910282619829637, 0.0910282619829637, 0.080140700335001,
  0.080140700335001, 0.0680383338123569, 0.0680383338123569, 0.0549046959758352, 0.0549046959758352,
  0.0409391567013063, 0.0409391567013063, 0.0263549866150321, 0.0263549866150321,
  0.0113937985010263, 0.0113937985010263
];

const X = [
  0.0, -0.1228646926107104, 0.1228646926107104, -0.2438668837209884, 0.2438668837209884,
  -0.3611723058093879, 0.3611723058093879, -0.473002731445715, 0.473002731445715,
  -0.5776629302412229, 0.5776629302412229, -0.6735663684734684, 0.6735663684734684,
  -0.7592592630373576, 0.7592592630373576, -0.833442628760834, 0.833442628760834,
  -0.8949919978782753, 0.8949919978782753, -0.9429745712289743, 0.9429745712289743,
  -0.9766639214595175, 0.9766639214595175, -0.9955569697904981, 0.9955569697904981
];

const roundToThreshold = (value: number, threshold: number) => {
  const inv = 1.0 / threshold;
  return Math.round(value * inv) / inv;
};

export const BezierUtils = {
  fromArc: (
    x1: number,
    y1: number,
    rx: number,
    ry: number,
    angle: number,
    large_arc_flag: 0 | 1,
    sweep_flag: 0 | 1,
    x2: number,
    y2: number,
    recursive?: [number, number, number, number] | undefined
  ): RawCubicSegment[] => {
    const rad = (PI / 180) * (angle ?? 0);

    if (!rx || !ry) {
      return [['C', x1, y1, x2, y2, x2, y2]];
    }

    let f1: number;
    let f2: number;
    let cx: number;
    let cy: number;

    if (recursive) {
      [f1, f2, cx, cy] = recursive;
    } else {
      const rot1 = rotate(x1, y1, -rad);
      x1 = rot1.x;
      y1 = rot1.y;

      const rot2 = rotate(x2, y2, -rad);
      x2 = rot2.x;
      y2 = rot2.y;

      const x = (x1 - x2) / 2;
      const y = (y1 - y2) / 2;

      const h = (x * x) / (rx * rx) + (y * y) / (ry * ry);
      if (h > 1) {
        const hSq = Math.sqrt(h);
        rx = hSq * rx;
        ry = hSq * ry;
      }

      const rx2 = rx * rx;
      const ry2 = ry * ry;
      const k =
        (large_arc_flag === sweep_flag ? -1 : 1) *
        Math.sqrt(Math.abs((rx2 * ry2 - rx2 * y * y - ry2 * x * x) / (rx2 * y * y + ry2 * x * x)));

      cx = (k * rx * y) / ry + (x1 + x2) / 2;
      cy = (k * -ry * x) / rx + (y1 + y2) / 2;

      f1 = Math.asin(Number(((y1 - cy) / ry).toFixed(9)));
      f2 = Math.asin(Number(((y2 - cy) / ry).toFixed(9)));

      f1 = x1 < cx ? PI - f1 : f1;
      f2 = x2 < cx ? PI - f2 : f2;
      f1 < 0 && (f1 = PI * 2 + f1);
      f2 < 0 && (f2 = PI * 2 + f2);

      if (sweep_flag && f1 > f2) {
        f1 -= PI * 2;
      }
      if (!sweep_flag && f2 > f1) {
        f2 -= PI * 2;
      }
    }

    const res: RawCubicSegment[] = [];

    if (Math.abs(f2 - f1) > _120) {
      const f2old = f2;
      const x2old = x2;
      const y2old = y2;

      f2 = f1 + _120 * (sweep_flag && f2 > f1 ? 1 : -1);
      x2 = cx + rx * Math.cos(f2);
      y2 = cy + ry * Math.sin(f2);
      res.push(
        ...BezierUtils.fromArc(x2, y2, rx, ry, angle, 0, sweep_flag, x2old, y2old, [
          f2,
          f2old,
          cx,
          cy
        ])
      );
    }

    const t = Math.tan((f2 - f1) / 4);
    const hx = (4 / 3) * rx * t;
    const hy = (4 / 3) * ry * t;

    const m2 = [x1 - hx * Math.sin(f1), y1 + hy * Math.cos(f1)];
    const m3 = [x2 + hx * Math.sin(f2), y2 - hy * Math.cos(f2)];
    const m4 = [x2, y2];

    if (recursive) {
      return [['C', m2[0], m2[1], m3[0], m3[1], m4[0], m4[1]], ...res];
    } else {
      const flattened = [['C', m2[0], m2[1], m3[0], m3[1], m4[0], m4[1]], ...res].flat();

      const dest: RawCubicSegment[] = [];
      for (let i = 0; i < flattened.length; i += 7) {
        dest.push([
          'C',
          rotate(flattened[i + 1] as number, flattened[i + 2] as number, rad).x,
          rotate(flattened[i + 1] as number, flattened[i + 2] as number, rad).y,
          rotate(flattened[i + 3] as number, flattened[i + 4] as number, rad).x,
          rotate(flattened[i + 3] as number, flattened[i + 4] as number, rad).y,
          rotate(flattened[i + 5] as number, flattened[i + 6] as number, rad).x,
          rotate(flattened[i + 5] as number, flattened[i + 6] as number, rad).y
        ] as RawCubicSegment);
      }
      return dest;
    }
  }
};

const SQRT_3 = Math.sqrt(3);

const VALID_EXTREMES = (e: number) => e >= 0 && e <= 1;

const sgn = (a: number) => {
  return a >= 0 ? 1 : -1;
};

const PI_2 = Math.PI * 2;
const PI_4 = Math.PI * 4;

const cubicRoots = (a: number, b: number, c: number, e: number) => {
  if (round(a) === 0) return quadraticRoots(b, c, e);

  const aq = b / a;
  const bq = c / a;
  const cq = e / a;

  const aq2 = aq * aq;
  const q = (3 * bq - aq2) / 9;
  const r = (9 * aq * bq - 27 * cq - 2 * aq * aq2) / 54;

  const q3 = q * q * q;
  const d = q3 + r * r;

  const roots: number[] = [];

  if (d >= 0) {
    const dsqrt = Math.sqrt(d);
    const s = sgn(r + dsqrt) * Math.pow(Math.abs(r + dsqrt), 1 / 3);
    const t = sgn(r - dsqrt) * Math.pow(Math.abs(r - dsqrt), 1 / 3);

    roots.push(-aq / 3 + (s + t));

    const Im = Math.abs((SQRT_3 * (s - t)) / 2);
    if (round(Im) === 0) {
      roots.push(-aq / 3 - (s + t) / 2);
    }
  } else {
    const th = Math.acos(r / Math.sqrt(-q3));

    const qs = 2 * Math.sqrt(-q);
    roots.push(qs * Math.cos(th / 3) - aq / 3);
    roots.push(qs * Math.cos((th + PI_2) / 3) - aq / 3);
    roots.push(qs * Math.cos((th + PI_4) / 3) - aq / 3);
  }

  return roots;
};

const quadraticRoots = (a: number, b: number, c: number) => {
  const d = b * b - 4 * a * c;
  if (d < 0) {
    return [];
  } else if (d === 0) {
    return [-b / (2 * a)];
  } else {
    const sqd = Math.sqrt(d);
    return [(-b + sqd) / (2 * a), (-b - sqd) / (2 * a)];
  }
};

export class CubicBezier {
  private _dp1: Point;
  private _dp2: Point;
  private _dp3: Point;

  private _bbox: Box | undefined;
  private _length: number | undefined;

  constructor(
    public readonly start: Point,
    public readonly cp1: Point,
    public readonly cp2: Point,
    public readonly end: Point
  ) {
    this._dp1 = {
      x: (cp1.x - start.x) * 3,
      y: (cp1.y - start.y) * 3
    };
    this._dp2 = {
      x: (cp2.x - cp1.x) * 3,
      y: (cp2.y - cp1.y) * 3
    };
    this._dp3 = {
      x: (end.x - cp2.x) * 3,
      y: (end.y - cp2.y) * 3
    };
  }

  point(t: number) {
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    return {
      x: this.start.x * mt3 + 3 * this.cp1.x * mt2 * t + 3 * this.cp2.x * mt * t2 + this.end.x * t3,
      y: this.start.y * mt3 + 3 * this.cp1.y * mt2 * t + 3 * this.cp2.y * mt * t2 + this.end.y * t3
    };
  }

  sample(n = 100) {
    const points = [];
    for (let i = 0; i <= n; i++) {
      points.push(this.point(i / n));
    }
    return points;
  }

  split(t: number): [CubicBezier, CubicBezier] {
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const m = {
      x: this.start.x * mt3 + 3 * this.cp1.x * mt2 * t + 3 * this.cp2.x * mt * t2 + this.end.x * t3,
      y: this.start.y * mt3 + 3 * this.cp1.y * mt2 * t + 3 * this.cp2.y * mt * t2 + this.end.y * t3
    };
    return [
      new CubicBezier(
        this.start,
        {
          x: this.start.x * mt + this.cp1.x * t,
          y: this.start.y * mt + this.cp1.y * t
        },
        {
          x: this.start.x * mt2 + 2 * this.cp1.x * t * mt + this.cp2.x * t2,
          y: this.start.y * mt2 + 2 * this.cp1.y * t * mt + this.cp2.y * t2
        },
        m
      ),
      new CubicBezier(
        m,
        {
          x: this.cp1.x * mt2 + 2 * this.cp2.x * t * mt + this.end.x * t2,
          y: this.cp1.y * mt2 + 2 * this.cp2.y * t * mt + this.end.y * t2
        },
        {
          x: this.cp2.x * mt + this.end.x * t,
          y: this.cp2.y * mt + this.end.y * t
        },
        this.end
      )
    ];
  }

  derivative(t: number) {
    const mt = 1 - t;
    return {
      x: mt * mt * this._dp1.x + 2 * mt * t * this._dp2.x + t * t * this._dp3.x,
      y: mt * mt * this._dp1.y + 2 * mt * t * this._dp2.y + t * t * this._dp3.y
    };
  }

  tangent(t: number) {
    const d = this.derivative(t);
    const l = Math.sqrt(d.x * d.x + d.y * d.y);
    return { x: d.x / l, y: d.y / l };
  }

  normal(t: number) {
    const d = this.derivative(t);
    const l = Math.sqrt(d.x * d.x + d.y * d.y);
    return { x: -d.y / l, y: d.x / l };
  }

  extreme() {
    const a_x = this._dp1.x - 2 * this._dp2.x + this._dp3.x;
    const a_y = this._dp1.y - 2 * this._dp2.y + this._dp3.y;
    const b_x = 2 * this._dp2.x - 2 * this._dp1.x;
    const b_y = 2 * this._dp2.y - 2 * this._dp1.y;
    const roots_x = quadraticRoots(a_x, b_x, this._dp1.x).filter(VALID_EXTREMES);
    const roots_y = quadraticRoots(a_y, b_y, this._dp1.y).filter(VALID_EXTREMES);

    return { x: roots_x, y: roots_y };
  }

  bbox() {
    if (this._bbox) return this._bbox;

    const extreme = this.extreme();

    if (extreme.x.length === 0 && extreme.y.length === 0) {
      this._bbox = Box.fromCorners(this.start, this.end);
      return this._bbox;
    }

    const x = [this.start.x, ...extreme.x.map(t => this.point(t).x), this.end.x];
    const y = [this.start.y, ...extreme.y.map(t => this.point(t).y), this.end.y];

    const mx = Math.min(...x);
    const my = Math.min(...y);

    this._bbox = {
      pos: { x: mx, y: my },
      size: { w: Math.max(...x) - mx, h: Math.max(...y) - my },
      rotation: 0
    };

    return this._bbox;
  }

  length() {
    if (this._length) return this._length;

    const z = 0.5;

    let sum = 0;
    for (let i = 0; i < X.length; i++) {
      sum += W[i] * this.darclen(z * X[i] + z);
    }

    this._length = z * sum;
    return this._length;
  }

  tAtLength(l: number) {
    let total = 0;
    const samples = this.sample();
    for (let i = 1; i < samples.length; i++) {
      const d = Point.distance(samples[i - 1], samples[i]);

      total += d;
      if (total >= l) {
        // interpolate between the last sample and the current sample
        const t = (l - (total - d)) / d;
        return (i - 1 + t) / samples.length;
      }
    }
    return 1;
  }

  intersectsBezier(other: CubicBezier, threshold = 0.5) {
    return this.recurseIntersection(this, other, threshold);
  }

  intersectsLine(line: Line) {
    const Ax = 3 * (this.cp1.x - this.cp2.x) + this.end.x - this.start.x;
    const Ay = 3 * (this.cp1.y - this.cp2.y) + this.end.y - this.start.y;

    const Bx = 3 * (this.start.x - 2 * this.cp1.x + this.cp2.x);
    const By = 3 * (this.start.y - 2 * this.cp1.y + this.cp2.y);

    const Cx = 3 * (this.cp1.x - this.start.x);
    const Cy = 3 * (this.cp1.y - this.start.y);

    const Dx = this.start.x;
    const Dy = this.start.y;

    const vx = line.to.y - line.from.y;
    const vy = line.from.x - line.to.x;

    const d = line.from.x * vx + line.from.y * vy;

    const roots = cubicRoots(
      vx * Ax + vy * Ay,
      vx * Bx + vy * By,
      vx * Cx + vy * Cy,
      vx * Dx + vy * Dy - d
    );

    const min_x = Math.min(line.from.x, line.to.x);
    const max_x = Math.max(line.from.x, line.to.x);
    const min_y = Math.min(line.from.y, line.to.y);
    const max_y = Math.max(line.from.y, line.to.y);

    const res = [];
    for (const t of roots) {
      if (t < 0 || t > 1 || isNaN(t)) continue;

      const p = {
        x: ((Ax * t + Bx) * t + Cx) * t + Dx,
        y: ((Ay * t + By) * t + Cy) * t + Dy
      };

      if (round(p.x) < round(min_x) || round(p.x) > round(max_x)) continue;
      if (round(p.y) < round(min_y) || round(p.y) > round(max_y)) continue;
      res.push(p);
    }

    return res;
  }

  projectPoint(p: Point): { distance: number; t: number; point: Point } {
    const samples = this.sample(25);
    let smallestIdx = smallestIndex(samples.map(s => Point.squareDistance(p, s)));

    let maxIter = 100;

    let v: number;
    let t1 = Math.max(0, smallestIdx - 1) / samples.length;
    let t2 = Math.min(samples.length - 1, smallestIdx + 1) / samples.length;
    while ((v = t2 - t1) > 0.001 && --maxIter > 0) {
      const subsamples = [
        this.point(t1),
        this.point(t1 + 0.25 * v),
        this.point(t1 + 0.5 * v),
        this.point(t1 + 0.75 * v),
        this.point(t2)
      ];

      smallestIdx = smallestIndex(subsamples.map(s => Point.squareDistance(p, s)));

      t1 = t1 + (v * Math.max(0, smallestIdx - 1)) / subsamples.length;
      t2 = t1 + (v * Math.min(subsamples.length - 1, smallestIdx + 1)) / subsamples.length;
    }

    const pp = this.point(t1);
    return { distance: Point.distance(pp, p), t: t1, point: pp };
  }

  private recurseIntersection(c1: CubicBezier, c2: CubicBezier, threshold = 0.5): Point[] {
    const c1b = c1.bbox();
    if (Math.max(c1b.size.w, c1b.size.h) < threshold) return [c1b.pos];

    const c2b = c2.bbox();
    if (Math.max(c2b.size.w, c2b.size.h) < threshold) return [c2b.pos];

    const cc1 = c1.split(0.5);
    const cc2 = c2.split(0.5);

    const results: Point[] = [];
    if (Box.intersects(cc1[0].bbox(), cc2[0].bbox())) {
      results.push(...this.recurseIntersection(cc1[0], cc2[0], threshold));
    }
    if (Box.intersects(cc1[0].bbox(), cc2[1].bbox())) {
      results.push(...this.recurseIntersection(cc1[0], cc2[1], threshold));
    }
    if (Box.intersects(cc1[1].bbox(), cc2[1].bbox())) {
      results.push(...this.recurseIntersection(cc1[1], cc2[1], threshold));
    }
    if (Box.intersects(cc1[1].bbox(), cc2[0].bbox())) {
      results.push(...this.recurseIntersection(cc1[1], cc2[0], threshold));
    }

    if (results.length <= 1) return results;

    const seen = new Set();
    const result: Point[] = [];
    for (let i = 0; i < results.length; i++) {
      const e = results[i];
      const key = `${roundToThreshold(e.x, threshold)},${roundToThreshold(e.y, threshold)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(e);
    }
    return result;
  }

  private darclen(t: number) {
    const d = this.derivative(t);
    return Math.sqrt(d.x * d.x + d.y * d.y);
  }
}
