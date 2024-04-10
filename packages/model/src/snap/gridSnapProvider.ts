import { MatchingMagnetPair, SnapProvider } from './snapManager';
import { Guide } from '../selectionState';
import { Diagram } from '../diagram';
import { MagnetOfType } from './magnet';
import { Box } from '@diagram-craft/geometry/box';
import { Line } from '@diagram-craft/geometry/line';
import { Axis } from '@diagram-craft/geometry/axis';
import { Point } from '@diagram-craft/geometry/point';

export class GridSnapProvider implements SnapProvider<'grid'> {
  constructor(private readonly diagram: Diagram) {}

  getMagnets(box: Box): ReadonlyArray<MagnetOfType<'grid'>> {
    const magnets: MagnetOfType<'grid'>[] = [];

    const grid = {
      x: this.diagram.props.grid?.size ?? 10,
      y: this.diagram.props.grid?.size ?? 10
    };

    const minX = Math.floor(box.x / grid.x);
    const maxX = Math.ceil((box.x + box.w) / grid.x);
    const minY = Math.floor(box.y / grid.y);
    const maxY = Math.ceil((box.y + box.h) / grid.y);

    for (let x = minX; x <= maxX; x++) {
      magnets.push({
        line: Line.of({ x: x * grid.x, y: minY * grid.y }, { x: x * grid.x, y: maxY * grid.y }),
        axis: Axis.v,
        type: 'grid'
      });
    }

    for (let y = minY; y <= maxY; y++) {
      magnets.push({
        line: Line.of({ x: minX * grid.x, y: y * grid.y }, { x: maxX * grid.x, y: y * grid.y }),
        axis: Axis.h,
        type: 'grid'
      });
    }

    return magnets;
  }

  makeGuide(box: Box, match: MatchingMagnetPair<'grid'>, _axis: Axis): Guide {
    return {
      line: Line.isHorizontal(match.matching.line)
        ? Line.of(
            { x: box.x, y: match.matching.line.from.y },
            { x: box.x + box.w, y: match.matching.line.from.y }
          )
        : Line.of(
            { x: match.matching.line.from.x, y: box.y },
            { x: match.matching.line.from.x, y: box.y + box.h }
          ),
      matchingMagnet: match.matching,
      selfMagnet: match.self
    };
  }

  moveMagnet(magnet: MagnetOfType<'grid'>, delta: Point): void {
    magnet.line = Line.move(magnet.line, delta);
  }
}
