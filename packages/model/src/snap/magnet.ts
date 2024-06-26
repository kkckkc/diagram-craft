import { DiagramNode } from '../diagramNode';
import { Line } from '@diagram-craft/geometry/line';
import { Axis } from '@diagram-craft/geometry/axis';
import { Direction } from '@diagram-craft/geometry/direction';
import { Range } from '@diagram-craft/geometry/range';
import { Point } from '@diagram-craft/geometry/point';
import { Box } from '@diagram-craft/geometry/box';

type BaseMagnet = {
  line: Line;
  axis: Axis;
  matchDirection?: Direction;
  respectDirection?: boolean;
};

export type DistancePair = {
  // TODO: This is a bit redundant as the distance will be the same for all pairs
  distance: number;

  pointA: Point;
  pointB: Point;
};

export type DistancePairWithRange = DistancePair & {
  rangeA: Range;
  rangeB: Range;
};

export type Magnet = BaseMagnet &
  (
    | {
        type: 'source' | 'canvas' | 'grid';
      }
    | {
        type: 'size';
        size: number;
        node: DiagramNode;
        // TODO: We should make these ReadonlyArray<>
        distancePairs: Array<DistancePair>;
      }
    | {
        type: 'node';
        node: DiagramNode;
      }
    | {
        type: 'distance';
        // TODO: We should make these ReadonlyArray<>
        distancePairs: Array<DistancePairWithRange>;
      }
  );

export type MagnetType = Magnet['type'];

export type MagnetOfType<T extends MagnetType> = Magnet & { type: T };

export const Magnet = {
  forNode: (node: Box, type: 'source' = 'source'): ReadonlyArray<Magnet> => {
    const center: Magnet[] = [
      {
        line: Line.horizontal(node.y + node.h / 2, [node.x, node.x + node.w]),
        axis: Axis.h,
        type
      },
      {
        line: Line.vertical(node.x + node.w / 2, [node.y, node.y + node.h]),
        axis: Axis.v,
        type
      }
    ];

    if (node.r !== 0) return center;

    center.push({
      line: Line.of({ x: node.x, y: node.y }, { x: node.x + node.w, y: node.y }),
      axis: Axis.h,
      type,
      matchDirection: 'n'
    });
    center.push({
      line: Line.of({ x: node.x, y: node.y + node.h }, { x: node.x + node.w, y: node.y + node.h }),
      axis: Axis.h,
      type,
      matchDirection: 's'
    });
    center.push({
      line: Line.of({ x: node.x, y: node.y }, { x: node.x, y: node.y + node.h }),
      axis: Axis.v,
      type,
      matchDirection: 'w'
    });
    center.push({
      line: Line.of({ x: node.x + node.w, y: node.y }, { x: node.x + node.w, y: node.y + node.h }),
      axis: Axis.v,
      type,
      matchDirection: 'e'
    });
    return center;
  }
};
