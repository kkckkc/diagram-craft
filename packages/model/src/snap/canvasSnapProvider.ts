import type { MatchingMagnetPair, SnapProvider } from './snapManager';
import type { Guide } from '../selectionState';
import type { Diagram } from '../diagram';
import type { MagnetOfType } from './magnet';
import { Box } from '@diagram-craft/geometry/box';
import { Line } from '@diagram-craft/geometry/line';
import { Axis } from '@diagram-craft/geometry/axis';
import { Point } from '@diagram-craft/geometry/point';

export class CanvasSnapProvider implements SnapProvider<'canvas'> {
  constructor(private readonly diagram: Diagram) {}

  getMagnets(_box: Box): ReadonlyArray<MagnetOfType<'canvas'>> {
    const { w, h } = this.diagram.canvas;
    return [
      {
        line: Line.of({ x: w / 2, y: 0 }, { x: w / 2, y: h }),
        axis: Axis.v,
        type: 'canvas'
      },
      {
        line: Line.of({ x: 0, y: h / 2 }, { x: w, y: h / 2 }),
        axis: Axis.h,
        type: 'canvas'
      }
    ];
  }

  makeGuide(_box: Box, match: MatchingMagnetPair<'canvas'>, _axis: Axis): Guide {
    return {
      line: match.matching.line,
      matchingMagnet: match.matching,
      selfMagnet: match.self
    };
  }

  moveMagnet(magnet: MagnetOfType<'canvas'>, delta: Point): void {
    magnet.line = Line.move(magnet.line, delta);
  }

  consolidate(guides: Guide[]): Guide[] {
    return guides;
  }
}
